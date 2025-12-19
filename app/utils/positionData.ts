// app/utils/positionData.ts

// Position data with corresponding default salaries
export const positions = [
  { id: 'Analyst', name: 'Analyst', salary: 35000, prefix: 'AN', roleClass: 'Class C' },
  { id: 'Assistant', name: 'Assistant', salary: 20000, prefix: 'AST', roleClass: 'Class C' },
  { id: 'Assistant Manager', name: 'Assistant Manager', salary: 75000, prefix: 'AM', roleClass: 'Class B' },
  { id: 'Clerk', name: 'Clerk', salary: 25000, prefix: 'CLK', roleClass: 'Class C' },
  { id: 'Department Supervisor', name: 'Department Supervisor', salary: 90000, prefix: 'SUP', roleClass: 'Class B' },
  { id: 'Division Manager', name: 'Division Manager', salary: 120000, prefix: 'DM', roleClass: 'Class B' },
  { id: 'HR Manager', name: 'HR Manager', salary: 100000, prefix: 'HRM', roleClass: 'Class B' },
  { id: 'HR Staff', name: 'HR Staff', salary: 45000, prefix: 'HRS', roleClass: 'Class C' },
  { id: 'Intern', name: 'Intern', salary: 15000, prefix: 'INT', roleClass: 'Class C' },
  { id: 'Manager', name: 'Manager', salary: 85000, prefix: 'MGR', roleClass: 'Class B' },
  { id: 'Senior Manager', name: 'Senior Manager', salary: 140000, prefix: 'SM', roleClass: 'Class A' },
  { id: 'System Administrator', name: 'System Administrator', salary: 80000, prefix: 'ADM', roleClass: 'Class A' },
  { id: 'Technician', name: 'Technician', salary: 28000, prefix: 'TECH', roleClass: 'Class C' }
];

// Department data
export const departments = [
  { id: 'Admin', name: 'Admin' },
  { id: 'Finance', name: 'Finance' },
  { id: 'HR', name: 'HR' },
  { id: 'IT', name: 'IT' },
  { id: 'Maintenance', name: 'Maintenance' },
  { id: 'Marketing', name: 'Marketing' },
  { id: 'Operations', name: 'Operations' }
];

// Function to get next employee ID based on position
export function getNextEmployeeId(position: string, currentEmployees: any[]) {
  const positionInfo = positions.find(p => p.id === position);
  const prefix = positionInfo?.prefix || 'EMP';
  
  // Filter employees with the same position prefix
  const employeesWithPrefix = currentEmployees.filter(emp => 
    emp.employeeId.startsWith(prefix)
  );
  
  if (employeesWithPrefix.length === 0) {
    return `${prefix}001`;
  }
  
  // Find the highest number
  let highestNum = 0;
  employeesWithPrefix.forEach(emp => {
    const matches = emp.employeeId.match(/\d+/);
    if (matches) {
      const num = parseInt(matches[0]);
      if (num > highestNum) {
        highestNum = num;
      }
    }
  });
  
  // Return next number
  return `${prefix}${String(highestNum + 1).padStart(3, '0')}`;
}

// Function to get salary for a position
export function getPositionSalary(positionId: string): number {
  const position = positions.find(p => p.id === positionId);
  return position?.salary || 0;
}

// Function to get role class for a position
export function getRoleClass(positionId: string): string {
  const position = positions.find(p => p.id === positionId);
  return position?.roleClass || 'Class C';
}