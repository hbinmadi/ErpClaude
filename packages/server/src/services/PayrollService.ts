import { db } from '../db';
import {
  employees, payrollRuns, payrollLines, payrollLineComponents,
  employeeSalaryComponents, salaryComponents, accounts,
} from '../db/schema';
import { eq, and, lte, gte, or, isNull } from 'drizzle-orm';
import { JournalService } from './JournalService';

async function getAccountIdByCode(code: string): Promise<number> {
  const [acc] = await db.select().from(accounts).where(eq(accounts.code, code));
  if (!acc) throw new Error(`Account not found: ${code}`);
  return acc.id;
}

export class PayrollService {
  static async calculate(
    payrollRunId: number,
    periodStartDate: string,
    _userId: number
  ): Promise<void> {
    const activeEmployees = await db
      .select()
      .from(employees)
      .where(and(eq(employees.isActive, true), eq(employees.isDeleted, false)));

    for (const emp of activeEmployees) {
      const components = await db
        .select({ sc: salaryComponents, esc: employeeSalaryComponents })
        .from(employeeSalaryComponents)
        .innerJoin(salaryComponents, eq(employeeSalaryComponents.salaryComponentId, salaryComponents.id))
        .where(
          and(
            eq(employeeSalaryComponents.employeeId, emp.id),
            lte(employeeSalaryComponents.effectiveFrom, periodStartDate),
            or(
              isNull(employeeSalaryComponents.effectiveTo),
              gte(employeeSalaryComponents.effectiveTo, periodStartDate)
            )
          )
        );

      let grossSalary = emp.basicSalary;
      let totalDeductions = 0;
      const lineComponents: Array<{
        name: string;
        type: string;
        amount: number;
        componentId: number;
      }> = [];

      for (const { sc, esc } of components) {
        let amount = esc.amount;

        if (sc.calculationType === 'percentage_of_basic') {
          amount = Math.round(emp.basicSalary * Number(esc.percentage ?? 0) / 100);
        } else if (sc.calculationType === 'percentage_of_gross') {
          amount = Math.round(grossSalary * Number(esc.percentage ?? 0) / 100);
        }

        if (sc.componentType === 'earning') {
          grossSalary += amount;
        } else if (sc.componentType === 'deduction') {
          totalDeductions += amount;
        }

        lineComponents.push({
          name: sc.name,
          type: sc.componentType,
          amount,
          componentId: sc.id,
        });
      }

      const netSalary = grossSalary - totalDeductions;

      const [line] = await db.insert(payrollLines).values({
        payrollRunId,
        employeeId: emp.id,
        departmentId: emp.departmentId ?? undefined,
        basicSalary: emp.basicSalary,
        grossSalary,
        totalDeductions,
        netSalary,
      }).returning({ id: payrollLines.id });

      for (const comp of lineComponents) {
        await db.insert(payrollLineComponents).values({
          payrollLineId: line.id,
          salaryComponentId: comp.componentId,
          componentName: comp.name,
          componentType: comp.type,
          amount: comp.amount,
        });
      }
    }

    const lines = await db.select().from(payrollLines)
      .where(eq(payrollLines.payrollRunId, payrollRunId));

    const totalGross = lines.reduce((s, l) => s + l.grossSalary, 0);
    const totalDeductions = lines.reduce((s, l) => s + l.totalDeductions, 0);
    const totalNet = lines.reduce((s, l) => s + l.netSalary, 0);

    await db.update(payrollRuns)
      .set({ totalGross, totalDeductions, totalNet })
      .where(eq(payrollRuns.id, payrollRunId));
  }

  static async approve(payrollRunId: number, userId: number): Promise<void> {
    const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, payrollRunId));
    if (!run) throw Object.assign(new Error('Payroll run not found'), { status: 404 });
    if (run.status !== 'draft') throw Object.assign(new Error('Not in draft'), { status: 409 });

    await db.update(payrollRuns)
      .set({ status: 'approved', approvedBy: userId, approvedAt: new Date() })
      .where(eq(payrollRuns.id, payrollRunId));
  }

  static async post(payrollRunId: number, userId: number): Promise<void> {
    const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, payrollRunId));
    if (!run) throw Object.assign(new Error('Payroll run not found'), { status: 404 });
    if (run.status !== 'approved') throw Object.assign(new Error('Must be approved first'), { status: 409 });

    const salaryAccId  = await getAccountIdByCode('6000');
    const taxAccId     = await getAccountIdByCode('2200');
    const accrualAccId = await getAccountIdByCode('2100');

    const withheldTax = Math.round(run.totalGross * 0.1);
    const netPayable  = run.totalGross - withheldTax;

    const jeId = await JournalService.createAndPost({
      entryDate: new Date(run.runDate),
      description: `Payroll Run ${run.runNumber}`,
      reference: run.runNumber,
      sourceModule: 'payroll',
      sourceId: payrollRunId,
      lines: [
        { accountId: salaryAccId,  debitAmount: run.totalGross, creditAmount: 0,           description: 'Gross salaries' },
        { accountId: taxAccId,     debitAmount: 0,              creditAmount: withheldTax,  description: 'Tax withheld' },
        { accountId: accrualAccId, debitAmount: 0,              creditAmount: netPayable,   description: 'Net salary payable' },
      ],
      createdBy: userId,
    });

    await db.update(payrollRuns)
      .set({ status: 'posted', journalEntryId: jeId })
      .where(eq(payrollRuns.id, payrollRunId));
  }
}
