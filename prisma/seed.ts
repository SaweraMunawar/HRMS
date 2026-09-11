// =====================================================================
//  HRMS Seed Data
//  Chalane ka tareeqa:  npx prisma db seed
//  Har dafa chalane pe purana data mita ke naya data dalta hai.
// =====================================================================
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import {
  PrismaClient,
  AnnouncementScope,
  ApprovalDecision,
  AttendanceStatus,
  EmployeeStatus,
  LeaveStatus,
} from "../src/generated/prisma/client";
import {
  addDays,
  countLeaveDays,
  isWeekend,
  needsEscalation,
  toDateOnly,
} from "../src/lib/leave-rules";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Password@123";
const EMAIL_DOMAIN = "nexora.com";
const TODAY = toDateOnly(new Date());
const YEAR = TODAY.getUTCFullYear();

// ---------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------

/** Aaj se n working days aage (n > 0) ya peeche (n < 0). n = 0 -> aaj ya agla working day */
function workday(n: number): Date {
  let d = TODAY;
  if (n === 0) {
    while (isWeekend(d)) d = addDays(d, 1);
    return d;
  }
  const step = n > 0 ? 1 : -1;
  let left = Math.abs(n);
  while (left > 0) {
    d = addDays(d, step);
    if (!isWeekend(d)) left--;
  }
  return d;
}

/** start se aage `days` working days ka aakhri din */
function endAfterWorkdays(start: Date, days: number): Date {
  let d = start;
  let left = days - 1;
  while (left > 0) {
    d = addDays(d, 1);
    if (!isWeekend(d)) left--;
  }
  return d;
}

function hoursAfter(d: Date, hours: number): Date {
  return new Date(d.getTime() + hours * 60 * 60 * 1000);
}

/** Har dafa same "random" numbers, taake data hamesha ek jaisa bane */
let rngState = 42;
function rand(): number {
  rngState = (rngState * 1103515245 + 12345) % 2147483648;
  return rngState / 2147483648;
}

// ---------------------------------------------------------------------
//  1. Master data definitions
// ---------------------------------------------------------------------

const ROLES = [
  { code: "SUPER_ADMIN", name: "Super Admin", description: "Global HR - all subsidiaries" },
  { code: "HR_MANAGER", name: "Subsidiary HR Manager", description: "Manages one subsidiary" },
  { code: "DEPT_HEAD", name: "Department Head", description: "Approves escalated leave" },
  { code: "TEAM_LEAD", name: "Team Lead", description: "First-level leave approval" },
  { code: "EMPLOYEE", name: "Employee", description: "Self-service only" },
] as const;
type RoleCode = (typeof ROLES)[number]["code"];

const COUNTRIES = [
  { code: "PK", name: "Pakistan" },
  { code: "AE", name: "United Arab Emirates" },
];

const SUBSIDIARIES = [
  { key: "KHI", name: "Nexora Karachi", city: "Karachi", country: "PK", timezone: "Asia/Karachi", currency: "PKR" },
  { key: "LHE", name: "Nexora Lahore", city: "Lahore", country: "PK", timezone: "Asia/Karachi", currency: "PKR" },
  { key: "DXB", name: "Nexora Dubai", city: "Dubai", country: "AE", timezone: "Asia/Dubai", currency: "AED" },
] as const;
type SubKey = (typeof SUBSIDIARIES)[number]["key"];

// Subsidiary -> Department -> Designations
const ORG: Record<SubKey, Record<string, string[]>> = {
  KHI: {
    Executive: ["Global HR Director"],
    "Human Resources": ["HR Manager", "HR Executive"],
    Engineering: ["Engineering Manager", "Team Lead", "Software Engineer"],
    Sales: ["Sales Director", "Sales Team Lead", "Sales Executive"],
    Finance: ["Finance Manager", "Accountant"],
  },
  LHE: {
    "Human Resources": ["HR Manager", "HR Executive"],
    Engineering: ["Engineering Manager", "Team Lead", "Software Engineer"],
    Support: ["Support Manager", "Support Team Lead", "Support Agent"],
  },
  DXB: {
    "Human Resources": ["HR Manager"],
    Sales: ["Sales Director", "Sales Team Lead", "Sales Executive"],
    Finance: ["Finance Manager", "Accountant"],
  },
};

// Public holidays (fixed-date + Eid dates as observed in 2026; 2027 for "upcoming")
const HOLIDAYS: Record<"PK" | "AE", { name: string; date: string }[]> = {
  PK: [
    { name: "Kashmir Solidarity Day", date: `${YEAR}-02-05` },
    { name: "Eid ul Fitr", date: "2026-03-20" },
    { name: "Pakistan Day", date: `${YEAR}-03-23` },
    { name: "Labour Day", date: `${YEAR}-05-01` },
    { name: "Eid ul Adha", date: "2026-05-27" },
    { name: "Youm-e-Takbeer", date: `${YEAR}-05-28` },
    { name: "Independence Day", date: `${YEAR}-08-14` },
    { name: "Iqbal Day", date: `${YEAR}-11-09` },
    { name: "Quaid-e-Azam Day", date: `${YEAR}-12-25` },
    { name: "Kashmir Solidarity Day", date: `${YEAR + 1}-02-05` },
    { name: "Pakistan Day", date: `${YEAR + 1}-03-23` },
  ],
  AE: [
    { name: "New Year's Day", date: `${YEAR}-01-01` },
    { name: "Eid al Fitr", date: "2026-03-20" },
    { name: "Eid al Adha", date: "2026-05-27" },
    { name: "Commemoration Day", date: `${YEAR}-12-01` },
    { name: "National Day", date: `${YEAR}-12-02` },
    { name: "National Day (Day 2)", date: `${YEAR}-12-03` },
    { name: "New Year's Day", date: `${YEAR + 1}-01-01` },
  ],
};

// Global leave types (subsidiaryId = null -> sab subsidiaries ke liye)
const LEAVE_TYPES = [
  { name: "Annual Leave", defaultAnnualQuota: 14, requiresEscalation: false, escalationThresholdDays: 3 },
  { name: "Sick Leave", defaultAnnualQuota: 10, requiresEscalation: false, escalationThresholdDays: 3 },
  { name: "Casual Leave", defaultAnnualQuota: 7, requiresEscalation: false, escalationThresholdDays: 2 },
  { name: "Unpaid Leave", defaultAnnualQuota: 30, requiresEscalation: true, escalationThresholdDays: 0 },
  { name: "Maternity Leave", defaultAnnualQuota: 90, requiresEscalation: true, escalationThresholdDays: 0 },
  { name: "Paternity Leave", defaultAnnualQuota: 10, requiresEscalation: true, escalationThresholdDays: 0 },
  { name: "Bereavement Leave", defaultAnnualQuota: 5, requiresEscalation: false, escalationThresholdDays: 3 },
  { name: "Work From Home", defaultAnnualQuota: 24, requiresEscalation: false, escalationThresholdDays: 5 },
];

// ---------------------------------------------------------------------
//  2. Employees + reporting hierarchy
//  manager = jis ko report karta hai. head = department ka head hai.
//  Chain example: Ali -> Sara (Team Lead) -> Usman (Dept Head) -> Ayesha (Super Admin)
// ---------------------------------------------------------------------
type EmpSpec = {
  key: string;
  first: string;
  last: string;
  role: RoleCode;
  sub: SubKey;
  dept: string;
  title: string;
  manager?: string;
  head?: boolean;
  status?: EmployeeStatus;
  joined: string;
};

const EMPLOYEES: EmpSpec[] = [
  // ---------------- Global ----------------
  { key: "ayesha", first: "Ayesha", last: "Khan", role: "SUPER_ADMIN", sub: "KHI", dept: "Executive", title: "Global HR Director", head: true, joined: "2018-01-15" },

  // ---------------- Karachi ----------------
  { key: "bilal", first: "Bilal", last: "Ahmed", role: "HR_MANAGER", sub: "KHI", dept: "Human Resources", title: "HR Manager", manager: "ayesha", head: true, joined: "2019-03-01" },
  { key: "sana_k", first: "Sana", last: "Javed", role: "EMPLOYEE", sub: "KHI", dept: "Human Resources", title: "HR Executive", manager: "bilal", joined: "2023-06-12" },

  { key: "usman", first: "Usman", last: "Raza", role: "DEPT_HEAD", sub: "KHI", dept: "Engineering", title: "Engineering Manager", manager: "ayesha", head: true, joined: "2019-08-20" },
  { key: "sara", first: "Sara", last: "Malik", role: "TEAM_LEAD", sub: "KHI", dept: "Engineering", title: "Team Lead", manager: "usman", joined: "2020-11-02" },
  { key: "ali", first: "Ali", last: "Hassan", role: "EMPLOYEE", sub: "KHI", dept: "Engineering", title: "Software Engineer", manager: "sara", joined: "2022-02-14" },
  { key: "hina", first: "Hina", last: "Shah", role: "EMPLOYEE", sub: "KHI", dept: "Engineering", title: "Software Engineer", manager: "sara", joined: "2022-07-01" },
  { key: "zain", first: "Zain", last: "Qureshi", role: "EMPLOYEE", sub: "KHI", dept: "Engineering", title: "Software Engineer", manager: "sara", joined: "2023-01-09" },
  { key: "fahad", first: "Fahad", last: "Iqbal", role: "TEAM_LEAD", sub: "KHI", dept: "Engineering", title: "Team Lead", manager: "usman", joined: "2021-04-19" },
  { key: "maryam", first: "Maryam", last: "Siddiqui", role: "EMPLOYEE", sub: "KHI", dept: "Engineering", title: "Software Engineer", manager: "fahad", joined: "2023-09-04" },
  { key: "omar_f", first: "Omar", last: "Farooq", role: "EMPLOYEE", sub: "KHI", dept: "Engineering", title: "Software Engineer", manager: "fahad", joined: "2024-03-11" },

  { key: "nadia", first: "Nadia", last: "Hussain", role: "DEPT_HEAD", sub: "KHI", dept: "Sales", title: "Sales Director", manager: "ayesha", head: true, joined: "2019-05-06" },
  { key: "kamran", first: "Kamran", last: "Ali", role: "TEAM_LEAD", sub: "KHI", dept: "Sales", title: "Sales Team Lead", manager: "nadia", joined: "2021-01-25" },
  { key: "saad", first: "Saad", last: "Rehman", role: "EMPLOYEE", sub: "KHI", dept: "Sales", title: "Sales Executive", manager: "kamran", joined: "2022-10-17" },
  { key: "fatima_k", first: "Fatima", last: "Noor", role: "EMPLOYEE", sub: "KHI", dept: "Sales", title: "Sales Executive", manager: "kamran", joined: "2024-06-03" },

  { key: "imran", first: "Imran", last: "Sheikh", role: "DEPT_HEAD", sub: "KHI", dept: "Finance", title: "Finance Manager", manager: "ayesha", head: true, joined: "2020-02-10" },
  { key: "rabia", first: "Rabia", last: "Anwar", role: "EMPLOYEE", sub: "KHI", dept: "Finance", title: "Accountant", manager: "imran", joined: "2023-04-24" },

  // ---------------- Lahore ----------------
  { key: "asad", first: "Asad", last: "Mehmood", role: "HR_MANAGER", sub: "LHE", dept: "Human Resources", title: "HR Manager", manager: "ayesha", head: true, joined: "2020-06-15" },
  { key: "amna", first: "Amna", last: "Tariq", role: "EMPLOYEE", sub: "LHE", dept: "Human Resources", title: "HR Executive", manager: "asad", joined: "2024-01-08" },

  { key: "tariq", first: "Tariq", last: "Javed", role: "DEPT_HEAD", sub: "LHE", dept: "Engineering", title: "Engineering Manager", manager: "ayesha", head: true, joined: "2020-09-01" },
  { key: "noor", first: "Noor", last: "Fatima", role: "TEAM_LEAD", sub: "LHE", dept: "Engineering", title: "Team Lead", manager: "tariq", joined: "2021-08-16" },
  { key: "hamza", first: "Hamza", last: "Yousaf", role: "EMPLOYEE", sub: "LHE", dept: "Engineering", title: "Software Engineer", manager: "noor", joined: "2023-02-20" },
  { key: "iqra", first: "Iqra", last: "Aslam", role: "EMPLOYEE", sub: "LHE", dept: "Engineering", title: "Software Engineer", manager: "noor", joined: "2024-05-13" },

  { key: "sana_b", first: "Sana", last: "Butt", role: "DEPT_HEAD", sub: "LHE", dept: "Support", title: "Support Manager", manager: "ayesha", head: true, joined: "2020-12-07" },
  { key: "waqas", first: "Waqas", last: "Khalid", role: "TEAM_LEAD", sub: "LHE", dept: "Support", title: "Support Team Lead", manager: "sana_b", joined: "2022-03-28" },
  { key: "ahmed", first: "Ahmed", last: "Nawaz", role: "EMPLOYEE", sub: "LHE", dept: "Support", title: "Support Agent", manager: "waqas", joined: "2023-07-10" },
  { key: "mehwish", first: "Mehwish", last: "Riaz", role: "EMPLOYEE", sub: "LHE", dept: "Support", title: "Support Agent", manager: "waqas", joined: "2024-02-19" },
  { key: "kashif", first: "Kashif", last: "Ali", role: "EMPLOYEE", sub: "LHE", dept: "Support", title: "Support Agent", manager: "waqas", status: EmployeeStatus.TERMINATED, joined: "2022-05-02" },

  // ---------------- Dubai ----------------
  { key: "priya", first: "Priya", last: "Nair", role: "HR_MANAGER", sub: "DXB", dept: "Human Resources", title: "HR Manager", manager: "ayesha", head: true, joined: "2021-02-01" },

  { key: "omar_m", first: "Omar", last: "Al Mansoori", role: "DEPT_HEAD", sub: "DXB", dept: "Sales", title: "Sales Director", manager: "ayesha", head: true, joined: "2020-10-12" },
  { key: "james", first: "James", last: "Carter", role: "TEAM_LEAD", sub: "DXB", dept: "Sales", title: "Sales Team Lead", manager: "omar_m", joined: "2022-01-17" },
  { key: "layla", first: "Layla", last: "Haddad", role: "EMPLOYEE", sub: "DXB", dept: "Sales", title: "Sales Executive", manager: "james", joined: "2023-03-06" },
  { key: "rohan", first: "Rohan", last: "Mehta", role: "EMPLOYEE", sub: "DXB", dept: "Sales", title: "Sales Executive", manager: "james", joined: "2024-04-22" },

  { key: "fatima_z", first: "Fatima", last: "Al Zaabi", role: "DEPT_HEAD", sub: "DXB", dept: "Finance", title: "Finance Manager", manager: "ayesha", head: true, joined: "2021-06-14" },
  { key: "arjun", first: "Arjun", last: "Das", role: "EMPLOYEE", sub: "DXB", dept: "Finance", title: "Accountant", manager: "fatima_z", joined: "2023-11-20" },
];

// ---------------------------------------------------------------------
//  3. Sample leave requests (dates aaj ke hisaab se banti hain)
//  flow: har approval level ka faisla. A = approved, R = rejected, P = pending
// ---------------------------------------------------------------------
type LeaveSpec = {
  emp: string;
  type: string;
  startOffset: number; // aaj se kitne working days (minus = past)
  days: number; // kitne working days
  reason: string;
  flow: ("A" | "R" | "P")[];
  comments?: string[];
};

const LEAVES: LeaveSpec[] = [
  // Level 1 pending (Team Lead ke paas)
  { emp: "ali", type: "Annual Leave", startOffset: 6, days: 2, reason: "Family wedding in Hyderabad", flow: ["P"] },
  { emp: "hamza", type: "Annual Leave", startOffset: 8, days: 3, reason: "Personal work", flow: ["P"] },
  { emp: "layla", type: "Annual Leave", startOffset: 10, days: 4, reason: "Visiting family in Beirut", flow: ["P"] },
  { emp: "rohan", type: "Casual Leave", startOffset: 3, days: 1, reason: "Car servicing", flow: ["P"] },

  // Team Lead ne approve kiya, ab Dept Head ke paas (escalated)
  { emp: "hina", type: "Annual Leave", startOffset: 12, days: 5, reason: "Umrah trip", flow: ["A", "P"], comments: ["Fine from my side, please approve."] },
  { emp: "saad", type: "Paternity Leave", startOffset: 4, days: 5, reason: "Newborn baby", flow: ["A", "P"], comments: ["Congratulations! Approved."] },

  // Mukammal approved
  { emp: "zain", type: "Sick Leave", startOffset: -7, days: 1, reason: "Fever", flow: ["A"], comments: ["Get well soon."] },
  { emp: "omar_f", type: "Annual Leave", startOffset: -20, days: 5, reason: "Northern areas trip", flow: ["A", "A"], comments: ["OK", "Approved, enjoy."] },
  { emp: "iqra", type: "Work From Home", startOffset: -3, days: 1, reason: "Home internet installation", flow: ["A"] },
  { emp: "ahmed", type: "Sick Leave", startOffset: -1, days: 2, reason: "Viral infection", flow: ["A"], comments: ["Take rest."] },
  { emp: "arjun", type: "Annual Leave", startOffset: -35, days: 3, reason: "Diwali preparations", flow: ["A"] },
  { emp: "fatima_k", type: "Casual Leave", startOffset: -12, days: 1, reason: "Bank work", flow: ["A"] },

  // Rejected
  { emp: "maryam", type: "Casual Leave", startOffset: 2, days: 1, reason: "Personal errand", flow: ["R"], comments: ["Sprint release that day, please pick another date."] },
  { emp: "mehwish", type: "Unpaid Leave", startOffset: 15, days: 3, reason: "Extended travel", flow: ["A", "R"], comments: ["OK from team side.", "Support is short-staffed that week."] },
];

// ---------------------------------------------------------------------
//  MAIN
// ---------------------------------------------------------------------
async function main() {
  console.log("Purana data saaf ho raha hai...");
  await clearDatabase();

  // ---- Roles ----
  const roleId: Record<string, number> = {};
  for (const r of ROLES) {
    const role = await prisma.role.create({ data: r });
    roleId[r.code] = role.id;
  }

  // ---- Countries ----
  const countryId: Record<string, number> = {};
  for (const c of COUNTRIES) {
    countryId[c.code] = (await prisma.country.create({ data: c })).id;
  }

  // ---- Subsidiaries, Departments, Designations ----
  const subId: Record<string, number> = {};
  const deptId: Record<string, number> = {};
  const desigId: Record<string, number> = {};
  for (const s of SUBSIDIARIES) {
    const sub = await prisma.subsidiary.create({
      data: { name: s.name, city: s.city, timezone: s.timezone, currency: s.currency, countryId: countryId[s.country] },
    });
    subId[s.key] = sub.id;

    for (const [deptName, titles] of Object.entries(ORG[s.key])) {
      const dept = await prisma.department.create({ data: { name: deptName, subsidiaryId: sub.id } });
      deptId[`${s.key}:${deptName}`] = dept.id;
      for (const title of titles) {
        const des = await prisma.designation.create({ data: { title, departmentId: dept.id } });
        desigId[`${s.key}:${deptName}:${title}`] = des.id;
      }
    }
  }

  // ---- Holidays ----
  const holidaysBySub: Record<string, Date[]> = {};
  for (const s of SUBSIDIARIES) {
    const list = HOLIDAYS[s.country].map((h) => ({ name: h.name, date: new Date(`${h.date}T00:00:00Z`) }));
    // Ek hi din do holidays ho to (e.g. Pakistan Day + Eid) sirf pehli rakho
    const unique = list.filter((h, i) => list.findIndex((x) => x.date.getTime() === h.date.getTime()) === i);
    await prisma.holiday.createMany({ data: unique.map((h) => ({ ...h, subsidiaryId: subId[s.key] })) });
    holidaysBySub[s.key] = unique.map((h) => h.date);
  }

  // ---- Leave types ----
  const leaveTypes = [];
  for (const lt of LEAVE_TYPES) leaveTypes.push(await prisma.leaveType.create({ data: lt }));
  const leaveTypeByName = Object.fromEntries(leaveTypes.map((t) => [t.name, t]));

  // ---- Employees (manager pehle banta hai, phir reports) ----
  console.log("Employees ban rahe hain...");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const emp: Record<string, { id: number; spec: EmpSpec }> = {};
  let counter = 1;
  for (const e of EMPLOYEES) {
    const deptKey = `${e.sub}:${e.dept}`;
    const created = await prisma.employee.create({
      data: {
        employeeCode: `EMP-${String(counter++).padStart(4, "0")}`,
        firstName: e.first,
        lastName: e.last,
        email: `${e.first}.${e.last}`.toLowerCase().replace(/\s+/g, "") + `@${EMAIL_DOMAIN}`,
        passwordHash,
        phone: e.sub === "DXB" ? "+971 50 000 0000" : "+92 300 0000000",
        joiningDate: new Date(`${e.joined}T00:00:00Z`),
        status: e.status ?? EmployeeStatus.ACTIVE,
        roleId: roleId[e.role],
        subsidiaryId: subId[e.sub],
        departmentId: deptId[deptKey],
        designationId: desigId[`${deptKey}:${e.title}`],
        managerId: e.manager ? emp[e.manager].id : null,
      },
    });
    emp[e.key] = { id: created.id, spec: e };

    if (e.head) {
      await prisma.department.update({ where: { id: deptId[deptKey] }, data: { headId: created.id } });
    }
  }

  // ---- Leave requests + approval steps + notifications ----
  console.log("Leave requests ban rahi hain...");
  const approvedRanges: { empKey: string; start: Date; end: Date }[] = [];
  const usedDays = new Map<string, number>(); // "empId:typeId" -> days

  for (const l of LEAVES) {
    const e = emp[l.emp];
    const type = leaveTypeByName[l.type];
    const start = workday(l.startOffset);
    const end = endAfterWorkdays(start, l.days);
    const totalDays = countLeaveDays(start, end, holidaysBySub[e.spec.sub]);

    // Approval chain: Level 1 = direct manager, Level 2 = department head
    const level1 = emp[e.spec.manager!].id;
    const dept = await prisma.department.findUniqueOrThrow({ where: { id: deptId[`${e.spec.sub}:${e.spec.dept}`] } });
    const escalate = needsEscalation(totalDays, type) && dept.headId !== null && dept.headId !== level1;
    const approvers = escalate ? [level1, dept.headId!] : [level1];

    if (l.flow.length > approvers.length) {
      throw new Error(`Seed error: ${l.emp} ki leave ke ${l.flow.length} steps diye magar chain ${approvers.length} ki hai`);
    }

    const rejected = l.flow.includes("R");
    const allApproved = !rejected && l.flow.length === approvers.length && l.flow.every((f) => f === "A");
    const status = rejected ? LeaveStatus.REJECTED : allApproved ? LeaveStatus.APPROVED : LeaveStatus.PENDING;

    const createdAt = l.startOffset > 0 ? addDays(TODAY, -1) : addDays(start, -5);

    const request = await prisma.leaveRequest.create({
      data: {
        employeeId: e.id,
        leaveTypeId: type.id,
        startDate: start,
        endDate: end,
        totalDays,
        reason: l.reason,
        status,
        currentLevel: l.flow.length,
        createdAt,
        steps: {
          create: l.flow.map((f, i) => ({
            level: i + 1,
            approverId: approvers[i],
            decision: f === "A" ? ApprovalDecision.APPROVED : f === "R" ? ApprovalDecision.REJECTED : ApprovalDecision.PENDING,
            comment: f === "P" ? null : (l.comments?.[i] ?? null),
            decidedAt: f === "P" ? null : hoursAfter(createdAt, 4 + i * 20),
            createdAt: hoursAfter(createdAt, i * 4),
          })),
        },
      },
    });

    const who = `${e.spec.first} ${e.spec.last}`;
    const pendingIdx = l.flow.indexOf("P");
    if (pendingIdx >= 0) {
      await prisma.notification.create({
        data: {
          employeeId: approvers[pendingIdx],
          message: `${who} requested ${totalDays} day(s) of ${type.name}${pendingIdx > 0 ? " (escalated)" : ""}.`,
          link: `/leave/${request.id}`,
          createdAt,
        },
      });
      if (pendingIdx > 0) {
        await prisma.notification.create({
          data: {
            employeeId: e.id,
            message: `Your ${type.name} was approved by your manager and is awaiting department head approval.`,
            link: `/leave/${request.id}`,
          },
        });
      }
    } else {
      await prisma.notification.create({
        data: {
          employeeId: e.id,
          message: `Your ${type.name} (${totalDays} day(s)) was ${status === LeaveStatus.APPROVED ? "approved" : "rejected"}.`,
          link: `/leave/${request.id}`,
          isRead: l.startOffset < -5,
        },
      });
    }

    if (status === LeaveStatus.APPROVED) {
      approvedRanges.push({ empKey: l.emp, start, end });
      const k = `${e.id}:${type.id}`;
      usedDays.set(k, (usedDays.get(k) ?? 0) + totalDays);
    }
  }

  // ---- Leave balances (har employee x har leave type, is saal ke liye) ----
  const balances = [];
  for (const { id } of Object.values(emp)) {
    for (const t of leaveTypes) {
      balances.push({ employeeId: id, leaveTypeId: t.id, year: YEAR, allotted: t.defaultAnnualQuota, used: usedDays.get(`${id}:${t.id}`) ?? 0 });
    }
  }
  await prisma.leaveBalance.createMany({ data: balances });

  // ---- Attendance: pichle 10 working days ----
  console.log("Attendance ban rahi hai...");
  const days: Date[] = [];
  for (let d = TODAY; days.length < 10; d = addDays(d, -1)) if (!isWeekend(d)) days.push(d);

  const attendance = [];
  for (const [key, { id, spec }] of Object.entries(emp)) {
    if (spec.status === EmployeeStatus.TERMINATED) continue;
    const holidays = holidaysBySub[spec.sub].map((h) => h.getTime());
    for (const day of days) {
      const onLeave = approvedRanges.some((r) => r.empKey === key && day >= r.start && day <= r.end);
      let status: AttendanceStatus = AttendanceStatus.PRESENT;
      if (holidays.includes(day.getTime())) status = AttendanceStatus.HOLIDAY;
      else if (onLeave) status = AttendanceStatus.LEAVE;
      else if (rand() < 0.06) status = AttendanceStatus.ABSENT;

      const present = status === AttendanceStatus.PRESENT;
      attendance.push({
        employeeId: id,
        date: day,
        status,
        checkIn: present ? hoursAfter(day, 4 + rand() * 0.75) : null, // ~9:00-9:45 PKT
        checkOut: present ? hoursAfter(day, 13 + rand() * 1.5) : null, // ~18:00-19:30 PKT
      });
    }
  }
  await prisma.attendance.createMany({ data: attendance });

  // Jo aaj leave pe hai uska status ON_LEAVE
  for (const r of approvedRanges) {
    if (TODAY >= r.start && TODAY <= r.end) {
      await prisma.employee.update({ where: { id: emp[r.empKey].id }, data: { status: EmployeeStatus.ON_LEAVE } });
    }
  }

  // ---- Announcements ----
  await prisma.announcement.createMany({
    data: [
      { title: "Welcome to the new HR portal", body: "All leave requests and approvals now happen here. Please update your profile.", scope: AnnouncementScope.GLOBAL, createdById: emp.ayesha.id, createdAt: addDays(TODAY, -10) },
      { title: "Annual health check-up", body: "Free health check-up for all Karachi staff at the office clinic next week.", scope: AnnouncementScope.SUBSIDIARY, subsidiaryId: subId.KHI, createdById: emp.bilal.id, createdAt: addDays(TODAY, -3) },
      { title: "Lahore office timings", body: "Office hours are 9:00 AM to 6:00 PM, Monday to Friday.", scope: AnnouncementScope.SUBSIDIARY, subsidiaryId: subId.LHE, createdById: emp.asad.id, createdAt: addDays(TODAY, -6) },
      { title: "National Day celebrations", body: "Join us for the UAE National Day celebration in the Dubai office lobby.", scope: AnnouncementScope.SUBSIDIARY, subsidiaryId: subId.DXB, createdById: emp.priya.id, createdAt: addDays(TODAY, -1) },
    ],
  });

  // ---- Summary ----
  const counts = {
    countries: await prisma.country.count(),
    subsidiaries: await prisma.subsidiary.count(),
    departments: await prisma.department.count(),
    employees: await prisma.employee.count(),
    leaveRequests: await prisma.leaveRequest.count(),
    attendance: await prisma.attendance.count(),
  };
  console.log("\nSeed mukammal!", counts);
  console.log(`\nDemo logins (password sab ka: ${DEMO_PASSWORD})`);
  const demo: [string, string][] = [
    ["Super Admin", "ayesha"],
    ["HR Manager (Karachi)", "bilal"],
    ["Department Head (Eng, Karachi)", "usman"],
    ["Team Lead (Eng, Karachi)", "sara"],
    ["Employee (Eng, Karachi)", "ali"],
  ];
  for (const [label, key] of demo) {
    const s = emp[key].spec;
    console.log(`  ${label.padEnd(32)} ${`${s.first}.${s.last}`.toLowerCase().replace(/\s+/g, "")}@${EMAIL_DOMAIN}`);
  }
}

/** Child tables pehle, parent baad mein (foreign keys ki wajah se) */
async function clearDatabase() {
  await prisma.notification.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leaveApprovalStep.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.employeeDocument.deleteMany();
  await prisma.department.updateMany({ data: { headId: null } });
  await prisma.employee.updateMany({ data: { managerId: null } });
  await prisma.employee.deleteMany();
  await prisma.designation.deleteMany();
  await prisma.department.deleteMany();
  await prisma.subsidiary.deleteMany();
  await prisma.country.deleteMany();
  await prisma.role.deleteMany();
  // IDs dobara 1 se shuru hon (sirf SQLite)
  await prisma.$executeRawUnsafe("DELETE FROM sqlite_sequence").catch(() => {});
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
