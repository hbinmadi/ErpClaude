import { db } from '../../../db';
import { payrollLines, payrollLineComponents, employees, payrollRuns } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { baseHtml, escHtml, sarAmount } from './base';

export async function renderPayslip(payrollRunId: number, employeeId: number): Promise<string> {
  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, payrollRunId));
  if (!run) throw Object.assign(new Error('Payroll run not found'), { status: 404 });

  const [line] = await db.select().from(payrollLines)
    .where(and(eq(payrollLines.payrollRunId, payrollRunId), eq(payrollLines.employeeId, employeeId)));
  if (!line) throw Object.assign(new Error('No payroll line for this employee'), { status: 404 });

  const [emp] = await db.select().from(employees).where(eq(employees.id, employeeId));
  const components = await db.select().from(payrollLineComponents)
    .where(eq(payrollLineComponents.payrollLineId, line.id));

  type Component = typeof components[number];
  const earnings   = components.filter((c: Component) => c.componentType === 'earning');
  const deductions = components.filter((c: Component) => c.componentType === 'deduction');

  const earningRows   = earnings.map((c: Component) =>
    `<tr><td>${escHtml(c.componentName)}</td><td style="text-align:right">${sarAmount(c.amount)}</td></tr>`
  ).join('');

  const deductionRows = deductions.map((c: Component) =>
    `<tr><td>${escHtml(c.componentName)}</td><td style="text-align:right">${sarAmount(c.amount)}</td></tr>`
  ).join('');

  const content = `
    <div class="header">
      <div class="company-block">
        <div class="en">Sara Advanced Trading Company</div>
        <div class="ar">شركة سارة للتجارة المتقدمة</div>
        <div class="meta">Khamis Mushait, Saudi Arabia &nbsp;|&nbsp; VAT: 310122393500003</div>
      </div>
      <div class="doc-block">
        <div class="doc-type">PAYSLIP</div>
        <div class="doc-number">${escHtml(run.runNumber)}</div>
        <div class="doc-date">Period: ${run.runDate}</div>
      </div>
    </div>

    <div class="info-strip">
      <div class="info-box">
        <h4>Employee</h4>
        <p><strong>${escHtml(emp?.fullName ?? '')}</strong></p>
        <p>ID: ${escHtml(emp?.employeeNumber ?? '')}</p>
        <p>Title: ${escHtml(emp?.jobTitle ?? '')}</p>
      </div>
      <div class="info-box">
        <h4>Bank Details</h4>
        <p>${escHtml(emp?.bankName ?? 'N/A')}</p>
        <p>Acc: ${escHtml(emp?.bankAccountNumber ?? 'N/A')}</p>
      </div>
    </div>

    <div style="display:flex;gap:20px;margin-bottom:12px">
      <div style="flex:1">
        <table>
          <thead><tr><th>Earnings</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>${earningRows}</tbody>
          <tfoot>
            <tr>
              <td>Gross Salary</td>
              <td style="text-align:right">${sarAmount(line.grossSalary)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div style="flex:1">
        <table>
          <thead><tr><th>Deductions</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>${deductionRows}</tbody>
          <tfoot>
            <tr>
              <td>Total Deductions</td>
              <td style="text-align:right">${sarAmount(line.totalDeductions)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <div class="totals-section">
      <div class="totals-box">
        <div class="totals-row"><span>Gross Salary</span><span>${sarAmount(line.grossSalary)}</span></div>
        <div class="totals-row"><span>Total Deductions</span><span>-${sarAmount(line.totalDeductions)}</span></div>
        <div class="totals-row grand"><span>NET SALARY</span><span>${sarAmount(line.netSalary)}</span></div>
      </div>
    </div>

    <div class="footer">
      <div>
        <p>This is a computer-generated payslip.</p>
        <p>هذه قسيمة راتب منشأة بالحاسوب.</p>
      </div>
    </div>`;

  return baseHtml(content, `Payslip ${emp?.employeeNumber ?? employeeId} — ${run.runNumber}`);
}
