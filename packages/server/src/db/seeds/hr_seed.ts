import 'dotenv/config';
import { db, pool } from '../../db';
import { departments, employees, salaryComponents, leaveTypes } from '../schema';

export async function seedHR() {
  // Departments
  const inserted = await db.insert(departments).values([
    { code: 'IT',  name: 'Information Technology' },
    { code: 'FIN', name: 'Finance & Accounting' },
  ]).onConflictDoNothing().returning({ id: departments.id });

  const itDept = inserted[0];

  // Salary components
  await db.insert(salaryComponents).values([
    { name: 'Basic Salary',         componentType: 'earning',               calculationType: 'fixed',                isTaxable: true },
    { name: 'Housing Allowance',    componentType: 'earning',               calculationType: 'percentage_of_basic',  isTaxable: false },
    { name: 'Transport Allowance',  componentType: 'earning',               calculationType: 'fixed',                isTaxable: false },
    { name: 'GOSI Employee',        componentType: 'deduction',             calculationType: 'percentage_of_basic',  isTaxable: false },
    { name: 'GOSI Employer',        componentType: 'employer_contribution', calculationType: 'percentage_of_basic',  isTaxable: false },
  ]).onConflictDoNothing();

  // Leave types
  await db.insert(leaveTypes).values([
    { name: 'Annual Leave',    daysPerYear: 21, isPaid: true,  carryForwardDays: 10 },
    { name: 'Sick Leave',      daysPerYear: 14, isPaid: true,  carryForwardDays: 0 },
    { name: 'Unpaid Leave',    daysPerYear: 30, isPaid: false, carryForwardDays: 0 },
    { name: 'Hajj Leave',      daysPerYear: 15, isPaid: true,  carryForwardDays: 0 },
    { name: 'Maternity Leave', daysPerYear: 70, isPaid: true,  carryForwardDays: 0 },
  ]).onConflictDoNothing();

  // Employees
  await db.insert(employees).values([
    { employeeNumber: 'EMP-00001', fullName: 'Mohammed Al-Qurashi', email: 'mo@sara.sa', departmentId: itDept?.id, hireDate: '2022-01-15', basicSalary: 1200000, jobTitle: 'IT Manager' },
    { employeeNumber: 'EMP-00002', fullName: 'Sara Al-Zahrani',     email: 'sz@sara.sa', departmentId: itDept?.id, hireDate: '2022-03-01', basicSalary: 800000,  jobTitle: 'Developer' },
    { employeeNumber: 'EMP-00003', fullName: 'Khalid Al-Otaibi',    email: 'ko@sara.sa',                           hireDate: '2021-07-10', basicSalary: 1500000, jobTitle: 'Finance Director' },
    { employeeNumber: 'EMP-00004', fullName: 'Fatima Al-Dossary',   email: 'fd@sara.sa',                           hireDate: '2023-01-02', basicSalary: 700000,  jobTitle: 'Accountant' },
    { employeeNumber: 'EMP-00005', fullName: 'Ahmed Al-Shehri',     email: 'as@sara.sa',                           hireDate: '2020-11-20', basicSalary: 600000,  jobTitle: 'Sales Representative' },
  ]).onConflictDoNothing();

  console.log('HR seed complete.');
}

seedHR().then(() => pool.end()).catch(err => { console.error(err); process.exit(1); });
