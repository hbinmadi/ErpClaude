import {
  pgTable, serial, text, boolean, integer, decimal,
  timestamp, date, pgEnum
} from 'drizzle-orm/pg-core';

export const employmentTypeEnum = pgEnum('employment_type', ['full_time', 'part_time', 'contract']);
export const componentTypeEnum = pgEnum('component_type', ['earning', 'deduction', 'employer_contribution']);
export const calculationTypeEnum = pgEnum('calculation_type', ['fixed', 'percentage_of_basic', 'percentage_of_gross']);
export const payrollStatusEnum = pgEnum('payroll_status', ['draft', 'approved', 'posted', 'cancelled']);
export const leaveStatusEnum = pgEnum('leave_status', ['pending', 'approved', 'rejected', 'cancelled']);

export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  parentId: integer('parent_id'),
  managerUserId: integer('manager_user_id'),
  costCenterId: integer('cost_center_id'),
  isActive: boolean('is_active').notNull().default(true),
});

export const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  employeeNumber: text('employee_number').notNull().unique(),
  userId: integer('user_id'),
  fullName: text('full_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  nationalId: text('national_id'),
  departmentId: integer('department_id').references(() => departments.id),
  jobTitle: text('job_title'),
  employmentType: employmentTypeEnum('employment_type').notNull().default('full_time'),
  hireDate: date('hire_date').notNull(),
  terminationDate: date('termination_date'),
  basicSalary: integer('basic_salary').notNull().default(0),
  bankAccountName: text('bank_account_name'),
  bankAccountNumber: text('bank_account_number'),
  bankName: text('bank_name'),
  isActive: boolean('is_active').notNull().default(true),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const salaryComponents = pgTable('salary_components', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  componentType: componentTypeEnum('component_type').notNull(),
  calculationType: calculationTypeEnum('calculation_type').notNull(),
  isTaxable: boolean('is_taxable').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
});

export const employeeSalaryComponents = pgTable('employee_salary_components', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull().references(() => employees.id),
  salaryComponentId: integer('salary_component_id').notNull().references(() => salaryComponents.id),
  amount: integer('amount').notNull().default(0),
  percentage: decimal('percentage', { precision: 5, scale: 2 }),
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'),
});

export const payrollRuns = pgTable('payroll_runs', {
  id: serial('id').primaryKey(),
  runNumber: text('run_number').notNull().unique(),
  periodId: integer('period_id').notNull(),
  runDate: date('run_date').notNull(),
  status: payrollStatusEnum('status').notNull().default('draft'),
  totalGross: integer('total_gross').notNull().default(0),
  totalDeductions: integer('total_deductions').notNull().default(0),
  totalNet: integer('total_net').notNull().default(0),
  totalEmployerCost: integer('total_employer_cost').notNull().default(0),
  approvedBy: integer('approved_by'),
  approvedAt: timestamp('approved_at'),
  journalEntryId: integer('journal_entry_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: integer('created_by').notNull(),
});

export const payrollLines = pgTable('payroll_lines', {
  id: serial('id').primaryKey(),
  payrollRunId: integer('payroll_run_id').notNull().references(() => payrollRuns.id),
  employeeId: integer('employee_id').notNull().references(() => employees.id),
  departmentId: integer('department_id'),
  basicSalary: integer('basic_salary').notNull(),
  grossSalary: integer('gross_salary').notNull(),
  totalDeductions: integer('total_deductions').notNull(),
  netSalary: integer('net_salary').notNull(),
});

export const payrollLineComponents = pgTable('payroll_line_components', {
  id: serial('id').primaryKey(),
  payrollLineId: integer('payroll_line_id').notNull().references(() => payrollLines.id),
  salaryComponentId: integer('salary_component_id').notNull(),
  componentName: text('component_name').notNull(),
  componentType: text('component_type').notNull(),
  amount: integer('amount').notNull(),
});

export const leaveTypes = pgTable('leave_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  daysPerYear: integer('days_per_year').notNull(),
  isPaid: boolean('is_paid').notNull().default(true),
  carryForwardDays: integer('carry_forward_days').notNull().default(0),
});

export const employeeLeaveBalances = pgTable('employee_leave_balances', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull().references(() => employees.id),
  leaveTypeId: integer('leave_type_id').notNull().references(() => leaveTypes.id),
  fiscalYearId: integer('fiscal_year_id').notNull(),
  entitledDays: integer('entitled_days').notNull(),
  takenDays: integer('taken_days').notNull().default(0),
  remainingDays: integer('remaining_days').notNull(),
});

export const leaveRequests = pgTable('leave_requests', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull().references(() => employees.id),
  leaveTypeId: integer('leave_type_id').notNull().references(() => leaveTypes.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  totalDays: integer('total_days').notNull(),
  reason: text('reason'),
  status: leaveStatusEnum('status').notNull().default('pending'),
  approvedBy: integer('approved_by'),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
