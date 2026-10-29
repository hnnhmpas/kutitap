import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  CreditCard,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  LogOut,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Award,
  Sparkles,
  Clock,
  Star,
  X,
  Heart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Month & Year State
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [currentMonthIndex, setCurrentMonthIndex] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const currentKey = `${months[currentMonthIndex]}-${currentYear}`;

  // Live USD to PHP exchange rate state
  const [usdToPhpRate, setUsdToPhpRate] = useState(56.50);
  const [rateTrend, setRateTrend] = useState('up');

  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates && data.rates.PHP) {
          const newRate = data.rates.PHP;
          setUsdToPhpRate(prev => {
            if (newRate > prev) setRateTrend('up');
            else if (newRate < prev) setRateTrend('down');
            return newRate;
          });
        }
      })
      .catch(() => {
        setUsdToPhpRate(56.50);
      });
  }, []);

  // Monthly Income State (Philippine Peso)
  const [incomes, setIncomes] = useState({
    'February-2026': { expected: '50000', actual: '48500' }
  });

  const currentIncome = incomes[currentKey] || { expected: '', actual: '' };

  const handleIncomeChange = (field, value) => {
    setIncomes(prev => ({
      ...prev,
      [currentKey]: { ...currentIncome, [field]: value }
    }));
  };

  // Utility Bills State
  const [utilityBills, setUtilityBills] = useState({
    'February-2026': {
      'PAG-IBIG House': { amount: '3500', paid: true },
      'PLDT WiFi': { amount: '1699', paid: false },
      'Meralco': { amount: '2800', paid: false },
      'Maynilad': { amount: '650', paid: true }
    }
  });

  const currentUtilityBills = utilityBills[currentKey] || {
    'PAG-IBIG House': { amount: '', paid: false },
    'PLDT WiFi': { amount: '', paid: false },
    'Meralco': { amount: '', paid: false },
    'Maynilad': { amount: '', paid: false }
  };

  const handleUtilityAmountChange = (billName, value) => {
    setUtilityBills(prev => ({
      ...prev,
      [currentKey]: {
        ...currentUtilityBills,
        [billName]: { ...currentUtilityBills[billName], amount: value }
      }
    }));
  };

  const handleUtilityTogglePaid = (billName) => {
    setUtilityBills(prev => ({
      ...prev,
      [currentKey]: {
        ...currentUtilityBills,
        [billName]: { ...currentUtilityBills[billName], paid: !currentUtilityBills[billName].paid }
      }
    }));
  };

  // Loans State
  const loanCategories = ['SPayLater', 'SLoan', 'Billease', 'Maya', 'Atome', 'TikTokPayLater'];
  const [activeLoanCategory, setActiveLoanCategory] = useState('SPayLater');
  
  const [dashMonthIndex, setDashMonthIndex] = useState(() => new Date().getMonth());
  const [dashYear, setDashYear] = useState(() => new Date().getFullYear());
  const [isDashMonthPickerOpen, setIsDashMonthPickerOpen] = useState(false);

  const loanTableYear = dashYear;
  const availableYears = Array.from({ length: 27 }, (_, i) => 2024 + i);

  const getCutoff30Label = (monthName, yearVal) => {
    if (monthName === 'February') {
      const isLeap = (yearVal % 4 === 0 && yearVal % 100 !== 0) || (yearVal % 400 === 0);
      return isLeap ? '29' : '28';
    }
    return '30';
  };

  const [loanTableData, setLoanTableData] = useState({
    'SPayLater': {
      columns: ['Arrears', 'Combined', 'Computer'],
      cells: {
        '2026-February-15th': { 'Arrears': '100' },
        '2026-November-15th': { 'Arrears': '100' },
        '2026-November-30th': { 'Combined': '150' }
      },
      paidStatus: {
        '2026-November-15th': false,
        '2026-November-30th': false
      }
    },
    'SLoan': { columns: ['Principal', 'Interest'], cells: {}, paidStatus: {} },
    'Billease': {
      columns: ['Installment 1', 'Installment 2'],
      cells: { '2026-November-15th': { 'Installment 1': '10000' } },
      paidStatus: { '2026-November-15th': false }
    },
    'Maya': { columns: ['Credit', 'PayLater'], cells: {}, paidStatus: {} },
    'Atome': { columns: ['Bills', 'Card'], cells: {}, paidStatus: {} },
    'TikTokPayLater': { columns: ['Orders'], cells: {}, paidStatus: {} }
  });

  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  const handleCellChange = (category, year, month, cutoff, colName, value) => {
    const rowKey = `${year}-${month}-${cutoff}`;
    setLoanTableData(prev => {
      const catData = prev[category] || { columns: [], cells: {}, paidStatus: {} };
      const rowCells = catData.cells[rowKey] || {};
      return {
        ...prev,
        [category]: {
          ...catData,
          cells: { ...catData.cells, [rowKey]: { ...rowCells, [colName]: value } }
        }
      };
    });
  };

  const handleToggleLoanPaid = (category, year, month, cutoff) => {
    const rowKey = `${year}-${month}-${cutoff}`;
    setLoanTableData(prev => {
      const catData = prev[category] || { columns: [], cells: {}, paidStatus: {} };
      const currentStatus = !!catData.paidStatus[rowKey];
      return {
        ...prev,
        [category]: {
          ...catData,
          paidStatus: { ...catData.paidStatus, [rowKey]: !currentStatus }
        }
      };
    });
  };

  const handleToggleCutoffPaidGlobal = (year, month, cutoff) => {
    const rowKey = `${year}-${month}-${cutoff}`;
    setLoanTableData(prev => {
      const updatedPrev = { ...prev };
      let anyUnpaid = false;
      loanCategories.forEach(cat => {
        const catData = updatedPrev[cat];
        if (catData && !catData.paidStatus[rowKey]) anyUnpaid = true;
      });
      const newTargetStatus = anyUnpaid;
      loanCategories.forEach(cat => {
        const catData = updatedPrev[cat];
        if (catData) {
          updatedPrev[cat] = {
            ...catData,
            paidStatus: { ...catData.paidStatus, [rowKey]: newTargetStatus }
          };
        }
      });
      return updatedPrev;
    });
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim()) {
      alert('Please enter a valid column name.');
      return;
    }
    const colTrim = newColumnName.trim();
    setLoanTableData(prev => {
      const catData = prev[activeLoanCategory];
      if (catData.columns.includes(colTrim)) {
        alert('Column already exists!');
        return prev;
      }
      return {
        ...prev,
        [activeLoanCategory]: { ...catData, columns: [...catData.columns, colTrim] }
      };
    });
    setNewColumnName('');
    setIsAddColumnModalOpen(false);
  };

  const handleDeleteColumn = (colName) => {
    if (window.confirm(`Are you sure you want to delete column "${colName}"?`)) {
      setLoanTableData(prev => {
        const catData = prev[activeLoanCategory];
        const updatedColumns = catData.columns.filter(c => c !== colName);
        
        // Clean up deleted column data from cells so totals update correctly
        const updatedCells = {};
        Object.entries(catData.cells || {}).forEach(([rowKey, rowCells]) => {
          const newRowCells = { ...rowCells };
          delete newRowCells[colName];
          if (Object.keys(newRowCells).length > 0) {
            updatedCells[rowKey] = newRowCells;
          }
        });

        return {
          ...prev,
          [activeLoanCategory]: {
            ...catData,
            columns: updatedColumns,
            cells: updatedCells
          }
        };
      });
    }
  };

  // Calculations
  const getCutoffSummary = (month, year, cutoff) => {
    let totalAmt = 0;
    let isPaid = true;
    let hasEntries = false;

    loanCategories.forEach(cat => {
      const catData = loanTableData[cat];
      if (!catData) return;
      const rowKey = `${year}-${month}-${cutoff}`;
      const rowCells = catData.cells[rowKey] || {};
      const catRowTotal = Object.values(rowCells).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
      if (catRowTotal > 0) {
        hasEntries = true;
        totalAmt += catRowTotal;
        if (!catData.paidStatus[rowKey]) isPaid = false;
      }
    });

    return { total: totalAmt, paid: hasEntries ? isPaid : false, hasEntries };
  };

  const dashMonthName = months[dashMonthIndex];
  const dash15Summary = getCutoffSummary(dashMonthName, dashYear, '15th');
  const dash30Summary = getCutoffSummary(dashMonthName, dashYear, '30th');
  const totalDashMonthLoans = dash15Summary.total + dash30Summary.total;

  const currentMonthName = months[currentMonthIndex];
  const current15Summary = getCutoffSummary(currentMonthName, currentYear, '15th');
  const current30Summary = getCutoffSummary(currentMonthName, currentYear, '30th');

  const consolidatedLoanItems = [];
  if (current15Summary.total > 0) {
    consolidatedLoanItems.push({
      id: `${currentKey}-15th`,
      cutoffKey: '15th',
      name: `Loans (${currentMonthName} 15th Cutoff)`,
      amount: current15Summary.total,
      paid: current15Summary.paid
    });
  }
  if (current30Summary.total > 0) {
    consolidatedLoanItems.push({
      id: `${currentKey}-30th`,
      cutoffKey: '30th',
      name: `Loans (${currentMonthName} ${getCutoff30Label(currentMonthName, currentYear)}th Cutoff)`,
      amount: current30Summary.total,
      paid: current30Summary.paid
    });
  }

  const loansTotalForCurrentMonth = consolidatedLoanItems.reduce((sum, item) => sum + item.amount, 0);

  let yearTotalCost = 0;
  let yearTotalPaid = 0;
  let yearTotalUnpaid = 0;

  months.forEach(m => {
    ['15th', '30th'].forEach(cutoff => {
      let cutoffSum = 0;
      let cutoffPaid = true;
      let cutoffHasEntries = false;

      loanCategories.forEach(cat => {
        const catData = loanTableData[cat];
        if (!catData) return;
        const rowKey = `${loanTableYear}-${m}-${cutoff}`;
        const rowCells = catData.cells[rowKey] || {};
        const catRowTotal = Object.values(rowCells).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
        if (catRowTotal > 0) {
          cutoffHasEntries = true;
          cutoffSum += catRowTotal;
          if (!catData.paidStatus[rowKey]) cutoffPaid = false;
        }
      });

      if (cutoffHasEntries) {
        yearTotalCost += cutoffSum;
        if (cutoffPaid) yearTotalPaid += cutoffSum;
        else yearTotalUnpaid += cutoffSum;
      }
    });
  });

  // Savings State
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [savingsGoals, setSavingsGoals] = useState([
    {
      id: 1,
      name: 'Christmas and New Year Fund',
      goalAmount: 30000,
      startMonth: 'August',
      startYear: 2026,
      endMonth: 'December',
      endYear: 2026,
      monthsList: [
        { monthKey: 'August-2026', amount: 6000, paid: true },
        { monthKey: 'September-2026', amount: 6000, paid: false },
        { monthKey: 'October-2026', amount: 6000, paid: false },
        { monthKey: 'November-2026', amount: 6000, paid: false },
        { monthKey: 'December-2026', amount: 6000, paid: false }
      ]
    }
  ]);

  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newStartMonthIndex, setNewStartMonthIndex] = useState(7);
  const [newStartYear, setNewStartYear] = useState(2026);
  const [newEndMonthIndex, setNewEndMonthIndex] = useState(11);
  const [newEndYear, setNewEndYear] = useState(2026);

  const handleCreateSavingsGoal = () => {
    if (!newGoalName.trim() || !newGoalAmount) {
      alert('Please enter a valid goal name and amount.');
      return;
    }
    const totalAmt = parseFloat(newGoalAmount) || 0;
    const startIndex = newStartYear * 12 + newStartMonthIndex;
    const endIndex = newEndYear * 12 + newEndMonthIndex;
    const diffMonths = endIndex >= startIndex ? (endIndex - startIndex + 1) : 1;
    const monthlyAmt = Math.round(totalAmt / diffMonths);

    const generatedMonths = [];
    let currM = newStartMonthIndex;
    let currY = newStartYear;

    for (let i = 0; i < diffMonths; i++) {
      generatedMonths.push({
        monthKey: `${months[currM]}-${currY}`,
        amount: i === diffMonths - 1 ? (totalAmt - (monthlyAmt * (diffMonths - 1))) : monthlyAmt,
        paid: false
      });
      currM++;
      if (currM > 11) { currM = 0; currY++; }
    }

    const newGoal = {
      id: Date.now(),
      name: newGoalName.trim(),
      goalAmount: totalAmt,
      startMonth: months[newStartMonthIndex],
      startYear: newStartYear,
      endMonth: months[newEndMonthIndex],
      endYear: newEndYear,
      monthsList: generatedMonths
    };

    setSavingsGoals(prev => [...prev, newGoal]);
    setNewGoalName('');
    setNewGoalAmount('');
    setIsAddGoalModalOpen(false);
  };

  const handleDeleteGoal = (id) => setSavingsGoals(prev => prev.filter(g => g.id !== id));

  const handleGoalMonthAmountChange = (goalId, monthKey, value) => {
    setSavingsGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal;
      const updatedMonths = goal.monthsList.map(m => m.monthKey === monthKey ? { ...m, amount: parseFloat(value) || 0 } : m);
      return { ...goal, monthsList: updatedMonths };
    }));
  };

  const handleGoalMonthTogglePaid = (goalId, monthKey) => {
    setSavingsGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal;
      const updatedMonths = goal.monthsList.map(m => m.monthKey === monthKey ? { ...m, paid: !m.paid } : m);
      return { ...goal, monthsList: updatedMonths };
    }));
  };

  const totalSavingsGoalsAmount = savingsGoals.reduce((sum, g) => sum + (parseFloat(g.goalAmount) || 0), 0);
  const totalSavingsSavedAmount = savingsGoals.reduce((sum, g) => {
    const goalSaved = g.monthsList.reduce((mSum, m) => mSum + (m.paid ? (parseFloat(m.amount) || 0) : 0), 0);
    return sum + goalSaved;
  }, 0);
  const totalSavingsAmountLeft = Math.max(0, totalSavingsGoalsAmount - totalSavingsSavedAmount);
  const activeSavingsCount = savingsGoals.length;
  const overallSavingsProgressPct = totalSavingsGoalsAmount > 0 ? Math.min(100, Math.round((totalSavingsSavedAmount / totalSavingsGoalsAmount) * 100)) : 0;

  // Expenses State
  const [monthlyExpenses, setMonthlyExpenses] = useState({});
  const currentExpenses = monthlyExpenses[currentKey] || [];

  const handleAddExpense = () => {
    const updated = [...currentExpenses, { id: Date.now(), category: '', amount: '', paid: false }];
    setMonthlyExpenses(prev => ({ ...prev, [currentKey]: updated }));
  };

  const handleExpenseChange = (id, field, value) => {
    const updated = currentExpenses.map(item => item.id === id ? { ...item, [field]: value } : item);
    setMonthlyExpenses(prev => ({ ...prev, [currentKey]: updated }));
  };

  const handleExpenseTogglePaid = (id) => {
    const updated = currentExpenses.map(item => item.id === id ? { ...item, paid: !item.paid } : item);
    setMonthlyExpenses(prev => ({ ...prev, [currentKey]: updated }));
  };

  const handleDeleteExpense = (id) => {
    const updated = currentExpenses.filter(item => item.id !== id);
    setMonthlyExpenses(prev => ({ ...prev, [currentKey]: updated }));
  };

  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) { setCurrentMonthIndex(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonthIndex(currentMonthIndex - 1);
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) { setCurrentMonthIndex(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonthIndex(currentMonthIndex + 1);
  };

  // Attendance State
  const [attMonthIndex, setAttMonthIndex] = useState(() => new Date().getMonth());
  const [attYear, setAttYear] = useState(() => new Date().getFullYear());
  const [attendanceRecords, setAttendanceRecords] = useState({
    '2026-10-29': { timedIn: true, time: '6:54 AM', status: 'Late', holidayOrLeave: '' }
  });
  const [isSwipingID, setIsSwipingID] = useState(false);

  const attMonthName = months[attMonthIndex];
  const maxAttYears = Array.from({ length: 11 }, (_, i) => 2026 + i);

  const getWorkingDaysInMonth = (mIdx, yVal) => {
    const days = [];
    const totalDays = new Date(yVal, mIdx + 1, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(yVal, mIdx, d);
      const dayOfWeek = dateObj.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days.push(d);
      }
    }
    return days;
  };

  const workingDays = getWorkingDaysInMonth(attMonthIndex, attYear);

  // Helper function to evaluate status based on time-in timestamp and night shift rules
  const evaluateStatusFromTime = (timeDate) => {
    const hours = timeDate.getHours();
    const minutes = timeDate.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes > 7 * 60 && totalMinutes <= 21 * 60) {
      return 'Out of Shift';
    } else if (totalMinutes > 21 * 60 && totalMinutes <= 22 * 60) {
      return 'Present';
    } else {
      return 'Late';
    }
  };

  const handleTimeInToday = () => {
    const today = new Date();
    const currentHour = today.getHours();
    
    // Night Shift Bleed Rule: If time-in is between midnight (00:00) and 7:00 AM, 
    // it belongs to the previous shift date (e.g. Thursday night shift bleeding into Friday morning).
    let targetDate = new Date(today);
    if (currentHour >= 0 && currentHour <= 7) {
      targetDate.setDate(targetDate.getDate() - 1);
    }

    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;

    const existing = attendanceRecords[dateKey];
    if (existing && existing.timedIn) {
      alert("You have already timed in for this shift date!");
      return;
    }

    const timeString = today.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    const evaluatedStatus = evaluateStatusFromTime(today);

    setIsSwipingID(true);
    setTimeout(() => {
      setIsSwipingID(false);
    }, 800);

    setAttendanceRecords(prev => ({
      ...prev,
      [dateKey]: { timedIn: true, time: timeString, status: evaluatedStatus, holidayOrLeave: '' }
    }));
  };

  const handleUpdateDayStatus = (dateKey, field, value) => {
    setAttendanceRecords(prev => {
      const existing = prev[dateKey] || { timedIn: false, time: '-', status: '-', holidayOrLeave: '' };
      return { ...prev, [dateKey]: { ...existing, [field]: value } };
    });
  };

  let totalWorkedHours = 0;
  workingDays.forEach(d => {
    const ddStr = String(d).padStart(2, '0');
    const mmStr = String(attMonthIndex + 1).padStart(2, '0');
    const dateKey = `${attYear}-${mmStr}-${ddStr}`;
    const rec = attendanceRecords[dateKey];
    if (rec && (rec.status === 'Present' || rec.status === 'Late')) {
      totalWorkedHours += 8;
    }
  });

  const estimatedSalaryPHP = Math.round(totalWorkedHours * 7.50 * usdToPhpRate);

  useEffect(() => {
    const targetKey = `${months[attMonthIndex]}-${attYear}`;
    setIncomes(prev => {
      const existing = prev[targetKey] || { expected: '', actual: '' };
      if (existing.expected === String(estimatedSalaryPHP)) return prev;
      return {
        ...prev,
        [targetKey]: { ...existing, expected: String(estimatedSalaryPHP) }
      };
    });
  }, [estimatedSalaryPHP, attMonthIndex, attYear]);

  const actualNum = parseFloat(currentIncome.actual) || 0;
  const expectedNum = parseFloat(currentIncome.expected) || 0;
  const diffNum = actualNum - expectedNum;

  const currentMonthSavingsItems = savingsGoals.map(goal => {
    const found = goal.monthsList.find(m => m.monthKey === currentKey);
    return { goalId: goal.id, name: goal.name, amount: found ? found.amount : 0, paid: found ? found.paid : false, exists: !!found };
  }).filter(item => item.exists);

  const savingsTotalFromGoals = currentMonthSavingsItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const utilityItems = Object.values(currentUtilityBills);
  const obligationItems = [...utilityItems, ...consolidatedLoanItems, ...currentMonthSavingsItems];
  const utilityTotal = utilityItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const obligationTotal = utilityTotal + loansTotalForCurrentMonth + savingsTotalFromGoals;
  const obligationPaidCount = obligationItems.filter(item => item.paid).length;
  const obligationPaidPct = obligationItems.length > 0 ? Math.round((obligationPaidCount / obligationItems.length) * 100) : 0;

  const expenseTotal = currentExpenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const activeExpenseCount = currentExpenses.length;
  const expensePaidCount = currentExpenses.filter(item => item.paid && item.category.trim() !== '').length;
  const expensePaidPct = activeExpenseCount > 0 ? Math.round((expensePaidCount / activeExpenseCount) * 100) : 0;

  const monthlyDueTotal = obligationTotal + expenseTotal;
  const remainingBudget = actualNum - monthlyDueTotal;

  const [dashFilterYear, setDashFilterYear] = useState(() => new Date().getFullYear());
  let annualActualIncomeSum = 0;
  months.forEach(m => {
    const mKey = `${m}-${dashFilterYear}`;
    const inc = incomes[mKey];
    if (inc && inc.actual) annualActualIncomeSum += parseFloat(inc.actual || 0);
  });

  let annualDuesSum = 0;
  months.forEach(m => {
    const mKey = `${m}-${dashFilterYear}`;
    const utils = utilityBills[mKey];
    if (utils) Object.values(utils).forEach(u => { annualDuesSum += parseFloat(u.amount || 0); });
    const exps = monthlyExpenses[mKey];
    if (exps) exps.forEach(e => { annualDuesSum += parseFloat(e.amount || 0); });
    ['15th', '30th'].forEach(cutoff => {
      loanCategories.forEach(cat => {
        const catData = loanTableData[cat];
        if (catData) {
          const rKey = `${dashFilterYear}-${m}-${cutoff}`;
          const rCells = catData.cells[rKey] || {};
          const rTotal = Object.values(rCells).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
          annualDuesSum += rTotal;
        }
      });
    });
  });

  const currentHourVal = new Date().getHours();
  let timeGreeting = "Good evening";
  if (currentHourVal < 12) timeGreeting = "Good morning";
  else if (currentHourVal < 18) timeGreeting = "Good afternoon";

  const funQuotesPool = [
    { text: "I love you more than butter! Let's get that money right and sweet!" },
    { text: "February: Short month, big cozy moves, zero budget stress!" },
    { text: "March into savings like the sweet butter bear queen you are!" },
    { text: "Bloom where you're planted, and sweeten your bank account too!" },
    { text: "Sunshine is warm, but your financial goals are sweeter. Let's crush them!" }
  ];
  const currentQuote = funQuotesPool[currentMonthIndex % funQuotesPool.length];

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'income-expense', label: 'Income & Expense', icon: Receipt },
    { id: 'savings', label: 'Savings', icon: PiggyBank },
    { id: 'loans', label: 'Loans', icon: CreditCard },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  ];

  return (
    <>
      <script src="https://cdn.tailwindcss.com"></script>
      <div style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#FFFBEA',
        fontFamily: "'Quicksand', sans-serif",
        color: '#4A3B32',
        display: 'flex',
        boxSizing: 'border-box',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        backgroundImage: 'radial-gradient(#FFEAA7 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px'
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');
          * { font-family: 'Quicksand', sans-serif; box-sizing: border-box; border: none; outline: none; }
          .butter-title { font-family: 'Playfair Display', serif; }
          
          @keyframes swipeRight {
            0% { transform: translateX(-100px); opacity: 0; }
            50% { transform: translateX(20px); opacity: 1; }
            100% { transform: translateX(0px); opacity: 1; }
          }
          .animate-swipe-id {
            animation: swipeRight 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }

          button, select, input {
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          }
          button:hover {
            transform: translateY(-1px);
          }
          button:active {
            transform: scale(0.97);
          }

          ::-webkit-scrollbar { width: 8px; height: 8px; }
          ::-webkit-scrollbar-track { background: #FFF3CD; border-radius: 9999px; }
          ::-webkit-scrollbar-thumb { background: #DFB15B; border-radius: 9999px; border: 2px solid #FFF3CD; }
          ::-webkit-scrollbar-thumb-hover { background: #C68B59; }
        `}</style>

        {/* SIDEBAR */}
        <div style={{
          width: isSidebarOpen ? '260px' : '80px',
          minWidth: isSidebarOpen ? '260px' : '80px',
          backgroundColor: '#FFFFFF',
          borderRadius: '0 32px 32px 0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px 16px',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          height: '100vh',
          boxShadow: '8px 0 30px rgba(223,177,91,0.15)',
          zIndex: 10,
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              {isSidebarOpen && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles style={{ width: '22px', height: '22px', color: '#DFB15B' }} />
                  <span className="butter-title" style={{ fontSize: '18px', color: '#C68B59', letterSpacing: '0.5px' }}>Butter Bear</span>
                </div>
              )}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                style={{
                  backgroundColor: '#FFF9E6',
                  borderRadius: '9999px',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#C68B59',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(223,177,91,0.2)',
                  margin: isSidebarOpen ? '0' : '0 auto'
                }}
              >
                {isSidebarOpen ? <ChevronLeft style={{ width: '16px', height: '16px' }} /> : <ChevronRight style={{ width: '16px', height: '16px' }} />}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {navItems.map(item => {
                const isActive = activeTab === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      backgroundColor: isActive ? '#FFEAA7' : 'transparent',
                      color: isActive ? '#5C3A21' : '#8C7A6B',
                      boxShadow: isActive ? '0 6px 16px rgba(255,234,167,0.5)' : 'none'
                    }}
                  >
                    <IconComponent style={{ width: '20px', height: '20px', minWidth: '20px' }} />
                    {isSidebarOpen && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {isSidebarOpen ? (
              <div style={{ backgroundColor: '#FFF9E6', borderRadius: '24px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(223,177,91,0.1)' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '9999px', backgroundColor: '#FFEAA7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#C68B59', flexShrink: 0, fontSize: '14px' }}>
                  🐻
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#5C3A21', whiteSpace: 'nowrap' }}>Hannah Mae</div>
                  <div style={{ fontSize: '11px', color: '#9E8FB8', fontWeight: 600 }}>Sweet Planner</div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '24px' }}>🐻</span>
              </div>
            )}

            <button
              onClick={() => alert("Sign In / Sign Out action triggered!")}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '9999px',
                backgroundColor: '#FFF3CD',
                color: '#C68B59',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(223,177,91,0.15)'
              }}
            >
              <LogOut style={{ width: '16px', height: '16px' }} />
              {isSidebarOpen && <span>Sign Out</span>}
            </button>
          </div>
        </div>

        {/* MAIN AREA */}
        <div style={{ flex: 1, height: '100vh', padding: '20px 28px', boxSizing: 'border-box', overflowY: 'auto', display: 'flex', flexDirection: 'column', width: '100%' }}>
          
          {/* HEADER BANNER */}
          <div style={{ textAlign: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '3px dashed #FFEAA7' }}>
            <h1 className="butter-title" style={{ fontSize: '34px', color: '#C68B59', letterSpacing: '2px', margin: '0 0 4px 0' }}>
              BUTTER BEAR BUDGET 🍯
            </h1>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#8C7A6B', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <span>DASHBOARD</span> • <span>ANNUAL OVERVIEW</span> • <span>BILL CALENDAR</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} style={{ width: '16px', height: '16px', color: '#DFB15B', fill: '#DFB15B' }} />
              ))}
            </div>
          </div>

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100%', gap: '20px' }}>
              <div style={{ background: 'linear-gradient(135deg, #FFF9E6 0%, #FFEAA7 100%)', borderRadius: '32px', padding: '24px 28px', boxShadow: '0 12px 35px rgba(223,177,91,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles style={{ width: '16px', height: '16px' }} /> Butter Bear Overview
                  </div>
                  <h2 className="butter-title" style={{ fontSize: '26px', color: '#5C3A21', margin: 0 }}>
                    {timeGreeting}, Hannah Mae! 🧸
                  </h2>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#8C7A6B', marginTop: '4px', marginBottom: 0 }}>
                    Here is your cozy financial summary filtered for year <span style={{ color: '#C68B59', fontWeight: 800 }}>{dashFilterYear}</span>.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#FFFFFF', padding: '8px 16px', borderRadius: '9999px', boxShadow: '0 4px 15px rgba(223,177,91,0.15)' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#5C3A21' }}>Filter Year:</span>
                  <select
                    value={dashFilterYear}
                    onChange={(e) => setDashFilterYear(parseInt(e.target.value))}
                    style={{ backgroundColor: '#FFF9E6', borderRadius: '9999px', padding: '6px 14px', fontWeight: 800, color: '#C68B59', fontSize: '13px', cursor: 'pointer' }}
                  >
                    {availableYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: '#FFF9E6', borderRadius: '28px', padding: '20px', boxShadow: '0 8px 25px rgba(223,177,91,0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase' }}>Annual Income ({dashFilterYear})</span>
                    <TrendingUp style={{ width: '20px', height: '20px', color: '#C68B59' }} />
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#5C3A21' }}>
                    ₱{annualActualIncomeSum.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#8C7A6B' }}>
                    Actual income recorded
                  </div>
                </div>

                <div style={{ backgroundColor: '#FFF9E6', borderRadius: '28px', padding: '20px', boxShadow: '0 8px 25px rgba(223,177,91,0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase' }}>Annual Dues & Expenses</span>
                    <TrendingDown style={{ width: '20px', height: '20px', color: '#C68B59' }} />
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#5C3A21' }}>
                    ₱{annualDuesSum.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#8C7A6B' }}>
                    Utilities, Bills & Expenses
                  </div>
                </div>

                <div style={{ backgroundColor: '#F4F9F4', borderRadius: '28px', padding: '20px', boxShadow: '0 8px 25px rgba(200,230,201,0.25)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#2E7D32', textTransform: 'uppercase' }}>Total Saved Amount</span>
                    <PiggyBank style={{ width: '20px', height: '20px', color: '#2E7D32' }} />
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#2E7D32' }}>
                    ₱{totalSavingsSavedAmount.toLocaleString()} <span style={{ fontSize: '13px' }}>({overallSavingsProgressPct}%)</span>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#2E7D32' }}>
                    Goal Target: ₱{totalSavingsGoalsAmount.toLocaleString()}
                  </div>
                </div>

                <div style={{ backgroundColor: '#FFF3CD', borderRadius: '28px', padding: '20px', boxShadow: '0 8px 25px rgba(223,177,91,0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase' }}>Loan Balances ({dashFilterYear})</span>
                    <CreditCard style={{ width: '20px', height: '20px', color: '#C68B59' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#2E7D32' }}>PAID</div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#2E7D32' }}>₱{yearTotalPaid.toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#C68B59' }}>UNPAID</div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#C68B59' }}>₱{yearTotalUnpaid.toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#8C7A6B', marginTop: '4px' }}>
                    Total Cost: ₱{yearTotalCost.toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', alignItems: 'stretch' }}>
                <div style={{ backgroundColor: '#FFF9E6', borderRadius: '32px', padding: '24px', boxShadow: '0 8px 25px rgba(223,177,91,0.15)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="butter-title" style={{ fontSize: '16px', color: '#C68B59', textTransform: 'uppercase', paddingBottom: '8px', borderBottom: '2px dashed #FFEAA7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LayoutDashboard style={{ width: '18px', height: '18px' }} /> Year-at-a-Glance Summary ({dashFilterYear})
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', fontWeight: 700 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#FFFFFF', borderRadius: '9999px', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                      <span style={{ color: '#5C3A21' }}>Total Annual Actual Income</span>
                      <span style={{ color: '#2E7D32' }}>₱{annualActualIncomeSum.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#FFFFFF', borderRadius: '9999px', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                      <span style={{ color: '#5C3A21' }}>Total Annual Obligations & Expenses</span>
                      <span style={{ color: '#C68B59' }}>₱{annualDuesSum.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#FFFFFF', borderRadius: '9999px', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                      <span style={{ color: '#5C3A21' }}>Total Savings Goals Accumulation</span>
                      <span style={{ color: '#2E7D32' }}>₱{totalSavingsSavedAmount.toLocaleString()} / ₱{totalSavingsGoalsAmount.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#FFFFFF', borderRadius: '9999px', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                      <span style={{ color: '#5C3A21' }}>Remaining Outstanding Loans</span>
                      <span style={{ color: '#C68B59' }}>₱{yearTotalUnpaid.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'linear-gradient(135deg, #FFF3CD 0%, #FFF9E6 100%)', borderRadius: '32px', padding: '24px', boxShadow: '0 8px 25px rgba(223,177,91,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Sparkles style={{ width: '16px', height: '16px' }} /> Daily Butter Motivation
                    </div>
                    <div style={{ backgroundColor: '#FFFFFF', padding: '18px', borderRadius: '24px', boxShadow: 'inset 0 2px 8px rgba(223,177,91,0.1)', fontSize: '13px', fontWeight: 700, color: '#5C3A21', lineHeight: '1.5' }}>
                      {currentQuote.text}
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#8C7A6B', marginTop: '12px' }}>
                    Butter Bear Planner • Stay Cozy
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* INCOME & EXPENSE TAB */}
          {activeTab === 'income-expense' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: '16px', position: 'relative', flexShrink: 0 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '14px' }}>
                  <button
                    onClick={handlePrevMonth}
                    style={{ backgroundColor: '#FFFFFF', borderRadius: '9999px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#C68B59', fontWeight: 800, boxShadow: '0 4px 12px rgba(223,177,91,0.2)' }}
                  >
                    <ChevronLeft style={{ width: '16px', height: '16px' }} />
                  </button>

                  <h2
                    onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                    className="butter-title"
                    style={{ fontSize: '28px', color: '#C68B59', margin: 0, cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {months[currentMonthIndex]} <span>{currentYear}</span>
                    <ChevronDown style={{ width: '16px', height: '16px', color: '#8C7A6B' }} />
                  </h2>

                  <button
                    onClick={handleNextMonth}
                    style={{ backgroundColor: '#FFFFFF', borderRadius: '9999px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#C68B59', fontWeight: 800, boxShadow: '0 4px 12px rgba(223,177,91,0.2)' }}
                  >
                    <ChevronRight style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>

                {isMonthPickerOpen && (
                  <div style={{ position: 'absolute', top: '55px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#FFFFFF', borderRadius: '28px', padding: '20px', boxShadow: '0 20px 40px rgba(223,177,91,0.25)', zIndex: 100, width: '320px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase' }}>Select Month & Year</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => setCurrentYear(Math.max(2024, currentYear - 1))}
                          style={{ padding: '6px 10px', borderRadius: '9999px', backgroundColor: '#FFF3CD', cursor: 'pointer', fontWeight: 800, color: '#C68B59' }}
                        >
                          <ChevronLeft style={{ width: '12px', height: '12px' }} />
                        </button>
                        <span style={{ fontWeight: 800, color: '#C68B59', fontSize: '14px' }}>{currentYear}</span>
                        <button
                          onClick={() => setCurrentYear(Math.min(2050, currentYear + 1))}
                          style={{ padding: '6px 10px', borderRadius: '9999px', backgroundColor: '#FFF3CD', cursor: 'pointer', fontWeight: 800, color: '#C68B59' }}
                        >
                          <ChevronRight style={{ width: '12px', height: '12px' }} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {months.map((m, idx) => (
                        <button
                          key={m}
                          onClick={() => { setCurrentMonthIndex(idx); setIsMonthPickerOpen(false); }}
                          style={{
                            padding: '10px 6px',
                            borderRadius: '9999px',
                            fontWeight: 800,
                            fontSize: '12px',
                            cursor: 'pointer',
                            backgroundColor: currentMonthIndex === idx ? '#DFB15B' : '#FFF9E6',
                            color: currentMonthIndex === idx ? '#FFFFFF' : '#5C3A21'
                          }}
                        >
                          {m.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <style>{`
                .planner-grid-fullscreen {
                  display: grid;
                  grid-template-columns: repeat(3, minmax(0, 1fr));
                  gap: 16px;
                  align-items: stretch;
                  width: 100%;
                  flex: 1;
                  padding-bottom: 16px;
                  box-sizing: border-box;
                }
                @media (max-width: 1100px) {
                  .planner-grid-fullscreen { grid-template-columns: 1fr; }
                }
              `}</style>

              <div className="planner-grid-fullscreen">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ backgroundColor: '#FFF3CD', borderRadius: '28px', padding: '18px', width: '100%', boxShadow: '0 8px 25px rgba(223,177,91,0.15)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase' }}>Income ({months[currentMonthIndex]} {currentYear})</div>
                        <span style={{ fontSize: '11px', color: '#8C7A6B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><ShieldCheck style={{ width: '14px', height: '14px' }} /> Saved</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: '#5C3A21', display: 'block', marginBottom: '4px' }}>Expected Income (₱) [Auto-Synced from Attendance]</label>
                          <input
                            type="number"
                            placeholder="e.g. 50000"
                            value={currentIncome.expected}
                            onChange={(e) => handleIncomeChange('expected', e.target.value)}
                            style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '10px 14px', borderRadius: '9999px', fontWeight: 800, fontSize: '15px', color: '#5C3A21', textAlign: 'center' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: '#2E7D32', display: 'block', marginBottom: '4px' }}>Actual Income (₱)</label>
                          <input
                            type="number"
                            placeholder="e.g. 48500"
                            value={currentIncome.actual}
                            onChange={(e) => handleIncomeChange('actual', e.target.value)}
                            style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '10px 14px', borderRadius: '9999px', fontWeight: 800, fontSize: '15px', color: '#2E7D32', textAlign: 'center' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: diffNum >= 0 ? '#2E7D32' : '#C68B59', display: 'block', marginBottom: '4px' }}>Difference (₱)</label>
                          <div style={{ backgroundColor: '#FFFFFF', padding: '10px 14px', borderRadius: '9999px', fontWeight: 800, fontSize: '15px', textAlign: 'center', width: '100%', color: diffNum >= 0 ? '#2E7D32' : '#C68B59' }}>
                            {diffNum >= 0 ? `+₱${diffNum.toLocaleString()}` : `-₱${Math.abs(diffNum).toLocaleString()}`}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#FFF3CD', borderRadius: '28px', padding: '18px', width: '100%', textAlign: 'center', boxShadow: '0 8px 25px rgba(223,177,91,0.15)' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase', marginBottom: '6px' }}>Monthly Due</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#8C7A6B', marginBottom: '8px' }}>Total of Obligations & Expenses</div>
                      <div style={{ backgroundColor: '#FFFFFF', padding: '12px 14px', borderRadius: '9999px', fontWeight: 800, fontSize: '18px', color: '#C68B59', textAlign: 'center', width: '100%' }}>
                        ₱{monthlyDueTotal.toLocaleString()}
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#FFF3CD', borderRadius: '28px', padding: '18px', width: '100%', textAlign: 'center', boxShadow: '0 8px 25px rgba(223,177,91,0.15)' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase', marginBottom: '6px' }}>Remaining Balance</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#8C7A6B', marginBottom: '8px' }}>Actual Income minus Due</div>
                      <div style={{ backgroundColor: '#FFFFFF', padding: '12px 14px', borderRadius: '9999px', fontWeight: 800, fontSize: '18px', textAlign: 'center', width: '100%', color: remainingBudget >= 0 ? '#2E7D32' : '#C68B59' }}>
                        {remainingBudget >= 0 ? `₱${remainingBudget.toLocaleString()}` : `-₱${Math.abs(remainingBudget).toLocaleString()}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'linear-gradient(135deg, #FFF9E6 0%, #FFF3CD 100%)', borderRadius: '28px', padding: '18px', textAlign: 'center', boxShadow: '0 8px 25px rgba(223,177,91,0.15)', width: '100%' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Sparkles style={{ width: '14px', height: '14px' }} /> Sweet Note for {months[currentMonthIndex]}
                    </div>
                    <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, color: '#5C3A21', lineHeight: '1.4' }}>
                      {currentQuote.text}
                    </div>
                  </div>
                </div>

                {/* MONTHLY OBLIGATIONS */}
                <div style={{ backgroundColor: '#FFF9E6', borderRadius: '28px', padding: '20px', width: '100%', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(100vh - 150px)', boxShadow: '0 8px 25px rgba(223,177,91,0.15)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div style={{ marginBottom: '12px', borderBottom: '2px dashed #FFEAA7', paddingBottom: '8px', flexShrink: 0 }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase' }}>Monthly Obligations</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 0.9fr', fontSize: '12px', fontWeight: 800, color: '#C68B59', marginBottom: '8px', padding: '0 4px', flexShrink: 0 }}>
                      <span>Category</span>
                      <span style={{ textAlign: 'center' }}>Amount</span>
                      <span style={{ textAlign: 'center' }}>Status</span>
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#5C3A21', textTransform: 'uppercase', margin: '4px 0', padding: '0 4px', letterSpacing: '0.5px' }}>
                        Utility Bills
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        {Object.entries(currentUtilityBills).map(([billName, data]) => (
                          <div key={billName} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 0.9fr', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '9999px', fontSize: '13px', width: '100%', gap: '6px', boxShadow: '0 2px 10px rgba(223,177,91,0.08)' }}>
                            <span style={{ fontWeight: 700, color: '#5C3A21', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', paddingLeft: '6px' }}>{billName}</span>
                            <input
                              type="number"
                              placeholder="0"
                              value={data.amount}
                              onChange={(e) => handleUtilityAmountChange(billName, e.target.value)}
                              style={{ width: '100%', backgroundColor: '#FFFBEA', padding: '6px 8px', borderRadius: '9999px', fontWeight: 700, fontSize: '13px', color: '#5C3A21', textAlign: 'center' }}
                            />
                            <button
                              onClick={() => handleUtilityTogglePaid(billName)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '9999px',
                                fontWeight: 800,
                                fontSize: '11px',
                                cursor: 'pointer',
                                textAlign: 'center',
                                width: '100%',
                                backgroundColor: data.paid ? '#C8E6C9' : '#FFF3CD',
                                color: data.paid ? '#2E7D32' : '#C68B59'
                              }}
                            >
                              {data.paid ? 'Paid' : 'Not Paid'}
                            </button>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 6px 0', padding: '0 4px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#5C3A21', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Loans Cutoffs (Consolidated)
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#FFF3CD', color: '#C68B59', padding: '2px 10px', borderRadius: '9999px' }}>Auto-Synced</span>
                      </div>

                      {consolidatedLoanItems.length === 0 ? (
                        <div style={{ fontSize: '12px', color: '#8C7A6B', fontStyle: 'italic', padding: '4px' }}>
                          No loans due this month
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                          {consolidatedLoanItems.map((item) => (
                            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 0.9fr', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '9999px', fontSize: '13px', width: '100%', gap: '6px', boxShadow: '0 2px 10px rgba(223,177,91,0.08)' }}>
                              <span style={{ fontWeight: 700, color: '#5C3A21', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', paddingLeft: '6px' }} title={item.name}>
                                {item.name}
                              </span>
                              <div style={{ width: '100%', backgroundColor: '#FFFBEA', padding: '6px 8px', borderRadius: '9999px', fontWeight: 700, fontSize: '13px', color: '#666', textAlign: 'center' }}>
                                ₱{parseFloat(item.amount || 0).toLocaleString()}
                              </div>
                              <button
                                onClick={() => handleToggleCutoffPaidGlobal(currentYear, currentMonthName, item.cutoffKey)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '9999px',
                                  fontWeight: 800,
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                  width: '100%',
                                  backgroundColor: item.paid ? '#C8E6C9' : '#FFF3CD',
                                  color: item.paid ? '#2E7D32' : '#C68B59'
                                }}
                              >
                                {item.paid ? 'Paid' : 'Not Paid'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 0.9fr', padding: '12px 14px', backgroundColor: '#FFEAA7', borderRadius: '9999px', fontSize: '12px', fontWeight: 800, color: '#5C3A21', marginTop: '12px', width: '100%', gap: '6px', flexShrink: 0, boxShadow: '0 4px 12px rgba(223,177,91,0.2)' }}>
                    <span style={{ paddingLeft: '6px' }}>TOTAL</span>
                    <span style={{ textAlign: 'center' }}>₱{obligationTotal.toLocaleString()}</span>
                    <span style={{ textAlign: 'center' }}>{obligationPaidPct}%</span>
                  </div>
                </div>

                {/* MONTHLY EXPENSES */}
                <div style={{ backgroundColor: '#FFF9E6', borderRadius: '28px', padding: '20px', width: '100%', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(100vh - 150px)', boxShadow: '0 8px 25px rgba(223,177,91,0.15)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '2px dashed #FFEAA7', paddingBottom: '8px', flexShrink: 0 }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase' }}>Monthly Expenses</span>
                      <button
                        onClick={handleAddExpense}
                        style={{ backgroundColor: '#DFB15B', color: '#FFFFFF', borderRadius: '9999px', padding: '6px 14px', fontWeight: 800, fontSize: '11px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(223,177,91,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Plus style={{ width: '14px', height: '14px' }} /> Add Expense
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 32px', fontSize: '12px', fontWeight: 800, color: '#C68B59', marginBottom: '8px', padding: '0 4px', flexShrink: 0 }}>
                      <span>Category</span>
                      <span style={{ textAlign: 'center' }}>Amount</span>
                      <span style={{ textAlign: 'center' }}>Status</span>
                      <span></span>
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {currentExpenses.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 8px', fontSize: '12px', color: '#8C7A6B', fontWeight: 700, fontStyle: 'italic' }}>
                          No expenses added yet. Click "+ Add Expense" above!
                        </div>
                      ) : (
                        currentExpenses.map((item) => (
                          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 32px', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '9999px', fontSize: '13px', width: '100%', gap: '6px', boxShadow: '0 2px 10px rgba(223,177,91,0.08)' }}>
                            <input
                              type="text"
                              placeholder="Category"
                              value={item.category}
                              onChange={(e) => handleExpenseChange(item.id, 'category', e.target.value)}
                              style={{ width: '100%', backgroundColor: '#FFFBEA', padding: '6px 8px', borderRadius: '9999px', fontWeight: 700, fontSize: '13px', color: '#5C3A21', paddingLeft: '8px' }}
                            />
                            <input
                              type="number"
                              placeholder="0"
                              value={item.amount}
                              onChange={(e) => handleExpenseChange(item.id, 'amount', e.target.value)}
                              style={{ width: '100%', backgroundColor: '#FFFBEA', padding: '6px 8px', borderRadius: '9999px', fontWeight: 700, fontSize: '13px', color: '#5C3A21', textAlign: 'center' }}
                            />
                            {item.category.trim() !== '' || item.amount !== '' ? (
                              <button
                                onClick={() => handleExpenseTogglePaid(item.id)}
                                style={{
                                  padding: '6px 4px',
                                  borderRadius: '9999px',
                                  fontWeight: 800,
                                  fontSize: '10px',
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                  width: '100%',
                                  backgroundColor: item.paid ? '#C8E6C9' : '#FFF3CD',
                                  color: item.paid ? '#2E7D32' : '#C68B59'
                                }}
                              >
                                {item.paid ? 'Paid' : 'Not Paid'}
                              </button>
                            ) : (
                              <div />
                            )}
                            <button
                              onClick={() => handleDeleteExpense(item.id)}
                              title="Delete Expense"
                              style={{ backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', color: '#C68B59' }}
                            >
                              <Trash2 style={{ width: '14px', height: '14px' }} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 32px', padding: '12px 14px', backgroundColor: '#FFEAA7', borderRadius: '9999px', fontSize: '12px', fontWeight: 800, color: '#5C3A21', marginTop: '12px', width: '100%', gap: '6px', flexShrink: 0, boxShadow: '0 4px 12px rgba(223,177,91,0.2)' }}>
                    <span style={{ paddingLeft: '6px' }}>TOTAL</span>
                    <span style={{ textAlign: 'center' }}>₱{expenseTotal.toLocaleString()}</span>
                    <span style={{ textAlign: 'center' }}>{expensePaidPct}%</span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SAVINGS TAB */}
          {activeTab === 'savings' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100%', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#FFF9E6', padding: '24px 28px', borderRadius: '32px', boxShadow: '0 10px 30px rgba(223,177,91,0.18)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <h2 className="butter-title" style={{ fontSize: '24px', color: '#C68B59', margin: '0 0 4px 0' }}>Savings Goals Honey Pot 🍯</h2>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#8C7A6B', margin: 0 }}>Create goals, track progress, and auto-sync monthly contributions!</p>
                  </div>
                  <button
                    onClick={() => setIsAddGoalModalOpen(true)}
                    style={{ backgroundColor: '#DFB15B', color: '#FFFFFF', borderRadius: '9999px', padding: '12px 22px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(223,177,91,0.35)', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Plus style={{ width: '16px', height: '16px' }} /> Add New Savings Goal
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginTop: '4px' }}>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 4px 15px rgba(223,177,91,0.1)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase', marginBottom: '4px' }}>Total Savings Goal</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#5C3A21' }}>₱{totalSavingsGoalsAmount.toLocaleString()}</div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 4px 15px rgba(200,230,201,0.2)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#2E7D32', textTransform: 'uppercase', marginBottom: '4px' }}>Total Saved Amount</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#2E7D32' }}>₱{totalSavingsSavedAmount.toLocaleString()} ({overallSavingsProgressPct}%)</div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 4px 15px rgba(223,177,91,0.1)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase', marginBottom: '4px' }}>Total Amount Left</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#C68B59' }}>₱{totalSavingsAmountLeft.toLocaleString()}</div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 4px 15px rgba(223,177,91,0.1)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#5C3A21', textTransform: 'uppercase', marginBottom: '4px' }}>Active Goals</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#5C3A21' }}>{activeSavingsCount}</div>
                  </div>
                </div>
              </div>

              {isAddGoalModalOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(92,58,33,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ backgroundColor: '#FFF9E6', borderRadius: '32px', padding: '24px 30px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px rgba(223,177,91,0.3)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px dashed #FFEAA7', paddingBottom: '12px' }}>
                      <div className="butter-title" style={{ fontSize: '18px', color: '#C68B59' }}>Add New Savings Goal</div>
                      <button onClick={() => setIsAddGoalModalOpen(false)} style={{ backgroundColor: '#FFF3CD', borderRadius: '9999px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#C68B59', fontWeight: 800 }}>
                        <X style={{ width: '16px', height: '16px' }} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#5C3A21', display: 'block', marginBottom: '4px' }}>Savings Goal Name</label>
                        <input
                          type="text"
                          placeholder="e.g. New Laptop or Honey Fund"
                          value={newGoalName}
                          onChange={(e) => setNewGoalName(e.target.value)}
                          style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: '9999px', fontWeight: 700, fontSize: '13px', color: '#5C3A21' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#5C3A21', display: 'block', marginBottom: '4px' }}>Goal Amount (₱)</label>
                        <input
                          type="number"
                          placeholder="e.g. 45000"
                          value={newGoalAmount}
                          onChange={(e) => setNewGoalAmount(e.target.value)}
                          style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: '9999px', fontWeight: 700, fontSize: '13px', color: '#5C3A21' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 800, color: '#5C3A21', display: 'block', marginBottom: '4px' }}>Start Date</label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <select
                              value={newStartMonthIndex}
                              onChange={(e) => setNewStartMonthIndex(parseInt(e.target.value))}
                              style={{ flex: 1, backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '9999px', fontWeight: 700, fontSize: '12px', color: '#5C3A21', cursor: 'pointer' }}
                            >
                              {months.map((m, idx) => (<option key={m} value={idx}>{m}</option>))}
                            </select>
                            <select
                              value={newStartYear}
                              onChange={(e) => setNewStartYear(parseInt(e.target.value))}
                              style={{ width: '80px', backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '9999px', fontWeight: 700, fontSize: '12px', color: '#5C3A21', cursor: 'pointer' }}
                            >
                              {availableYears.map(y => (<option key={y} value={y}>{y}</option>))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 800, color: '#5C3A21', display: 'block', marginBottom: '4px' }}>End Date</label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <select
                              value={newEndMonthIndex}
                              onChange={(e) => setNewEndMonthIndex(parseInt(e.target.value))}
                              style={{ flex: 1, backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '9999px', fontWeight: 700, fontSize: '12px', color: '#5C3A21', cursor: 'pointer' }}
                            >
                              {months.map((m, idx) => (<option key={m} value={idx}>{m}</option>))}
                            </select>
                            <select
                              value={newEndYear}
                              onChange={(e) => setNewEndYear(parseInt(e.target.value))}
                              style={{ width: '80px', backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '9999px', fontWeight: 700, fontSize: '12px', color: '#5C3A21', cursor: 'pointer' }}
                            >
                              {availableYears.map(y => (<option key={y} value={y}>{y}</option>))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                      <button onClick={() => setIsAddGoalModalOpen(false)} style={{ backgroundColor: '#FFF3CD', borderRadius: '9999px', padding: '10px 20px', fontWeight: 800, fontSize: '13px', color: '#5C3A21', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={handleCreateSavingsGoal} style={{ backgroundColor: '#DFB15B', borderRadius: '9999px', padding: '10px 24px', fontWeight: 800, fontSize: '13px', color: '#FFFFFF', cursor: 'pointer', boxShadow: '0 4px 15px rgba(223,177,91,0.3)' }}>Create Goal</button>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {savingsGoals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px', backgroundColor: '#FFF9E6', borderRadius: '28px', color: '#5C3A21', fontWeight: 800, fontSize: '16px' }}>
                    No savings goals created yet. Click "Add New Savings Goal" above!
                  </div>
                ) : (
                  savingsGoals.map(goal => {
                    const goalAmountNum = goal.goalAmount || 0;
                    const totalSavedNum = goal.monthsList.reduce((sum, m) => sum + (m.paid ? (parseFloat(m.amount) || 0) : 0), 0);
                    const amountLeftNum = Math.max(0, goalAmountNum - totalSavedNum);
                    const progressPct = goalAmountNum > 0 ? Math.min(100, Math.round((totalSavedNum / goalAmountNum) * 100)) : 0;

                    return (
                      <div key={goal.id} style={{ backgroundColor: '#FFF9E6', borderRadius: '32px', padding: '24px', boxShadow: '0 8px 25px rgba(223,177,91,0.15)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                              <h3 className="butter-title" style={{ fontSize: '20px', color: '#C68B59', margin: 0 }}>{goal.name}</h3>
                              <button onClick={() => handleDeleteGoal(goal.id)} style={{ backgroundColor: '#FFF3CD', borderRadius: '9999px', padding: '4px 10px', color: '#C68B59', fontWeight: 800, fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Trash2 style={{ width: '12px', height: '12px' }} /> Delete
                              </button>
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#8C7A6B' }}>
                              Start: <span style={{ color: '#5C3A21', fontWeight: 800 }}>{goal.monthsList[0]?.monthKey || 'N/A'}</span> | End: <span style={{ color: '#5C3A21', fontWeight: 800 }}>{goal.monthsList[goal.monthsList.length - 1]?.monthKey || 'N/A'}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ backgroundColor: '#FFFFFF', padding: '12px 18px', borderRadius: '20px', textAlign: 'center', minWidth: '100px', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                              <div style={{ fontSize: '10px', fontWeight: 800, color: '#5C3A21', textTransform: 'uppercase', marginBottom: '2px' }}>Goal Amount</div>
                              <div style={{ fontSize: '15px', fontWeight: 800, color: '#5C3A21' }}>₱{goalAmountNum.toLocaleString()}</div>
                            </div>
                            <div style={{ backgroundColor: '#FFFFFF', padding: '12px 18px', borderRadius: '20px', textAlign: 'center', minWidth: '120px', boxShadow: '0 4px 12px rgba(200,230,201,0.15)' }}>
                              <div style={{ fontSize: '10px', fontWeight: 800, color: '#2E7D32', textTransform: 'uppercase', marginBottom: '2px' }}>Total Saved</div>
                              <div style={{ fontSize: '15px', fontWeight: 800, color: '#2E7D32' }}>₱{totalSavedNum.toLocaleString()} ({progressPct}%)</div>
                            </div>
                            <div style={{ backgroundColor: '#FFFFFF', padding: '12px 18px', borderRadius: '20px', textAlign: 'center', minWidth: '100px', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                              <div style={{ fontSize: '10px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase', marginBottom: '2px' }}>Amount Left</div>
                              <div style={{ fontSize: '15px', fontWeight: 800, color: '#C68B59' }}>₱{amountLeftNum.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                          <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: 800, color: '#5C3A21' }}>
                            Progress: <span style={{ color: '#2E7D32' }}>{progressPct}%</span> Completed
                          </div>
                          <div style={{ width: '100%', height: '16px', backgroundColor: '#FFFFFF', borderRadius: '9999px', overflow: 'hidden', padding: '2px', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.05)' }}>
                            <div style={{ height: '100%', backgroundColor: '#DFB15B', borderRadius: '9999px', width: `${progressPct}%`, transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '2px dashed #FFEAA7', paddingTop: '14px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#5C3A21', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Month-by-Month Honey Schedule
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '10px' }}>
                            {goal.monthsList.map((mItem) => (
                              <div key={mItem.monthKey} style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#5C3A21' }}>{mItem.monthKey}</span>
                                  <button
                                    onClick={() => handleGoalMonthTogglePaid(goal.id, mItem.monthKey)}
                                    style={{
                                      borderRadius: '9999px',
                                      padding: '4px 12px',
                                      fontWeight: 800,
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                      backgroundColor: mItem.paid ? '#C8E6C9' : '#FFF3CD',
                                      color: mItem.paid ? '#2E7D32' : '#C68B59'
                                    }}
                                  >
                                    {mItem.paid ? 'Paid' : 'Not Paid'}
                                  </button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#FFFBEA', borderRadius: '9999px', padding: '4px 10px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#C68B59', marginRight: '4px' }}>₱</span>
                                  <input
                                    type="number"
                                    value={mItem.amount}
                                    onChange={(e) => handleGoalMonthAmountChange(goal.id, mItem.monthKey, e.target.value)}
                                    style={{ width: '100%', backgroundColor: 'transparent', fontWeight: 700, fontSize: '13px', color: '#5C3A21', textAlign: 'left' }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* LOANS TAB */}
          {activeTab === 'loans' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100%', gap: '16px' }}>
              <div style={{ background: 'linear-gradient(135deg, #FFF9E6 0%, #FFF3CD 100%)', borderRadius: '32px', padding: '22px 26px', boxShadow: '0 10px 30px rgba(223,177,91,0.18)', display: 'flex', flexDirection: 'column', gap: '14px', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CreditCard style={{ width: '16px', height: '16px' }} /> Loans Honey Dashboard
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', position: 'relative' }}>
                      <div
                        onClick={() => setIsDashMonthPickerOpen(!isDashMonthPickerOpen)}
                        className="butter-title"
                        style={{ fontSize: '18px', color: '#C68B59', cursor: 'pointer', userSelect: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span>{dashMonthName} {dashYear}</span>
                        <span style={{ fontSize: '11px', color: '#8C7A6B', display: 'flex', alignItems: 'center', gap: '2px' }}>Change <ChevronDown style={{ width: '12px', height: '12px' }} /></span>
                      </div>

                      {isDashMonthPickerOpen && (
                        <div style={{ position: 'absolute', top: '40px', left: 0, backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '16px', boxShadow: '0 20px 40px rgba(223,177,91,0.25)', zIndex: 200, width: '300px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase' }}>Select Dashboard Month</span>
                            <select
                              value={dashYear}
                              onChange={(e) => setDashYear(parseInt(e.target.value))}
                              style={{ backgroundColor: '#FFF3CD', borderRadius: '9999px', padding: '4px 10px', fontWeight: 800, color: '#C68B59', fontSize: '12px', cursor: 'pointer' }}
                            >
                              {availableYears.map(y => (<option key={y} value={y}>{y}</option>))}
                            </select>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                            {months.map((m, idx) => (
                              <button
                                key={m}
                                onClick={() => { setDashMonthIndex(idx); setIsDashMonthPickerOpen(false); }}
                                style={{
                                  padding: '8px 4px',
                                  borderRadius: '9999px',
                                  fontWeight: 700,
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  backgroundColor: dashMonthIndex === idx ? '#DFB15B' : '#FFF9E6',
                                  color: dashMonthIndex === idx ? '#FFFFFF' : '#5C3A21'
                                }}
                              >
                                {m.slice(0, 3)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase', marginBottom: '4px' }}>{dashMonthName} 15th Cutoff</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#5C3A21' }}>₱{dash15Summary.total.toLocaleString()}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, marginTop: '2px', color: dash15Summary.paid ? '#2E7D32' : '#C68B59' }}>{dash15Summary.paid ? 'Paid' : 'Pending'}</div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase', marginBottom: '4px' }}>{dashMonthName} {getCutoff30Label(dashMonthName, dashYear)}th Cutoff</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#5C3A21' }}>₱{dash30Summary.total.toLocaleString()}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, marginTop: '2px', color: dash30Summary.paid ? '#2E7D32' : '#C68B59' }}>{dash30Summary.paid ? 'Paid' : 'Pending'}</div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#5C3A21', textTransform: 'uppercase', marginBottom: '4px' }}>Total {dashMonthName} Loans</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#5C3A21' }}>₱{totalDashMonthLoans.toLocaleString()}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#8C7A6B', marginTop: '2px' }}>Consolidated</div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#5C3A21', textTransform: 'uppercase', marginBottom: '4px' }}>{loanTableYear} Annual Total</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#5C3A21' }}>₱{yearTotalCost.toLocaleString()}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#8C7A6B', marginTop: '2px' }}>All Categories</div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 4px 12px rgba(200,230,201,0.2)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#2E7D32', textTransform: 'uppercase', marginBottom: '4px' }}>{loanTableYear} Total Paid</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#2E7D32' }}>₱{yearTotalPaid.toLocaleString()}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#2E7D32', marginTop: '2px' }}>Cleared</div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase', marginBottom: '4px' }}>{loanTableYear} Total Unpaid</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#C68B59' }}>₱{yearTotalUnpaid.toLocaleString()}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#C68B59', marginTop: '2px' }}>Remaining</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {loanCategories.map(cat => {
                    const isActive = activeLoanCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveLoanCategory(cat)}
                        style={{
                          padding: '10px 20px',
                          borderRadius: '9999px',
                          fontWeight: 800,
                          fontSize: '13px',
                          cursor: 'pointer',
                          backgroundColor: isActive ? '#DFB15B' : '#FFFFFF',
                          color: isActive ? '#FFFFFF' : '#5C3A21',
                          boxShadow: isActive ? '0 4px 15px rgba(223,177,91,0.4)' : '0 2px 8px rgba(0,0,0,0.04)'
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setIsAddColumnModalOpen(true)}
                  style={{ backgroundColor: '#DFB15B', color: '#FFFFFF', borderRadius: '9999px', padding: '10px 20px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(223,177,91,0.35)', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus style={{ width: '16px', height: '16px' }} /> Add Column to {activeLoanCategory}
                </button>
              </div>

              {isAddColumnModalOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(92,58,33,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ backgroundColor: '#FFF9E6', borderRadius: '32px', padding: '24px 28px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 50px rgba(223,177,91,0.3)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px dashed #FFEAA7', paddingBottom: '10px' }}>
                      <div className="butter-title" style={{ fontSize: '16px', color: '#C68B59' }}>Add Column to {activeLoanCategory}</div>
                      <button onClick={() => setIsAddColumnModalOpen(false)} style={{ backgroundColor: '#FFF3CD', borderRadius: '9999px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#C68B59', fontWeight: 800 }}>
                        <X style={{ width: '14px', height: '14px' }} />
                      </button>
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 800, color: '#5C3A21', display: 'block', marginBottom: '4px' }}>Item / Column Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Combined, Arrears, Gadget"
                        value={newColumnName}
                        onChange={(e) => setNewColumnName(e.target.value)}
                        style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: '9999px', fontWeight: 700, fontSize: '13px', color: '#5C3A21' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                      <button onClick={() => setIsAddColumnModalOpen(false)} style={{ backgroundColor: '#FFF3CD', borderRadius: '9999px', padding: '10px 18px', fontWeight: 800, fontSize: '13px', color: '#5C3A21', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={handleAddColumn} style={{ backgroundColor: '#DFB15B', borderRadius: '9999px', padding: '10px 20px', fontWeight: 800, fontSize: '13px', color: '#FFFFFF', cursor: 'pointer', boxShadow: '0 4px 15px rgba(223,177,91,0.3)' }}>Add Column</button>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '28px', overflowX: 'auto', boxShadow: '0 8px 25px rgba(223,177,91,0.15)', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '650px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#FFF9E6', borderBottom: '3px dashed #FFEAA7' }}>
                      <th style={{ padding: '14px 18px', fontSize: '13px', fontWeight: 800, color: '#C68B59', width: '140px', textAlign: 'center' }}>
                        Date / Cutoff ({loanTableYear})
                      </th>
                      <th style={{ padding: '14px 18px', fontSize: '14px', fontWeight: 800, color: '#C68B59', textAlign: 'center' }} colSpan={(loanTableData[activeLoanCategory]?.columns.length || 0) + 2}>
                        {activeLoanCategory} Honey Table View
                      </th>
                    </tr>
                    <tr style={{ backgroundColor: '#FFF3CD', borderBottom: '2px solid #FFEAA7' }}>
                      <th style={{ padding: '10px 18px', fontSize: '12px', fontWeight: 800, color: '#5C3A21', textAlign: 'center' }}>Cutoff</th>
                      {loanTableData[activeLoanCategory]?.columns.map(col => (
                        <th key={col} style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 800, color: '#5C3A21', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                            <span style={{ flex: 1, textAlign: 'center' }}>{col}</span>
                            <button onClick={() => handleDeleteColumn(col)} title="Delete Column" style={{ backgroundColor: 'transparent', color: '#C68B59', cursor: 'pointer', padding: '2px' }}>
                              <X style={{ width: '12px', height: '12px' }} />
                            </button>
                          </div>
                        </th>
                      ))}
                      <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 800, color: '#2E7D32', textAlign: 'center', backgroundColor: '#F4F9F4' }}>Row Total</th>
                      <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 800, color: '#5C3A21', textAlign: 'center', backgroundColor: '#FFF3CD' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.flatMap((m) => [
                      { month: m, cutoff: '15th', label: `${m.slice(0, 3)} 15` },
                      { month: m, cutoff: '30th', label: `${m.slice(0, 3)} ${getCutoff30Label(m, loanTableYear)}` }
                    ]).map((row, idx) => {
                      const rowKey = `${loanTableYear}-${row.month}-${row.cutoff}`;
                      const catData = loanTableData[activeLoanCategory] || { columns: [], cells: {}, paidStatus: {} };
                      const rowValues = catData.cells[rowKey] || {};
                      const rowTotalNum = Object.values(rowValues).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
                      const isPaid = !!catData.paidStatus[rowKey];

                      return (
                        <tr key={rowKey} style={{ borderBottom: '1px solid #FFF3CD', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FFFBEA' }}>
                          <td style={{ padding: '10px 18px', fontSize: '13px', fontWeight: 800, color: '#5C3A21', textAlign: 'center', backgroundColor: '#FFF9E6' }}>
                            {row.label}
                          </td>
                          {catData.columns.map(col => {
                            const val = rowValues[col] || '';
                            return (
                              <td key={col} style={{ padding: '6px 10px', textAlign: 'center' }}>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={val}
                                  onChange={(e) => handleCellChange(activeLoanCategory, loanTableYear, row.month, row.cutoff, col, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    borderRadius: '9999px',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    color: '#5C3A21',
                                    textAlign: 'center',
                                    backgroundColor: val ? '#FFEAA7' : '#FFFBEA'
                                  }}
                                />
                              </td>
                            );
                          })}
                          <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 800, color: '#2E7D32', textAlign: 'center', backgroundColor: '#F4F9F4' }}>
                            {rowTotalNum > 0 ? `₱${rowTotalNum.toLocaleString()}` : '-'}
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleToggleLoanPaid(activeLoanCategory, loanTableYear, row.month, row.cutoff)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '9999px',
                                fontWeight: 800,
                                fontSize: '11px',
                                cursor: 'pointer',
                                width: '100%',
                                backgroundColor: isPaid ? '#C8E6C9' : '#FFF3CD',
                                color: isPaid ? '#2E7D32' : '#C68B59'
                              }}
                            >
                              {isPaid ? 'Paid' : 'Not Paid'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100%', gap: '20px' }}>
              <style>{`
                @keyframes swipeRight {
                  0% { transform: translateX(-100px); opacity: 0; }
                  50% { transform: translateX(20px); opacity: 1; }
                  100% { transform: translateX(0px); opacity: 1; }
                }
                .animate-swipe-id {
                  animation: swipeRight 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }

                .cutesy-dropdown {
                  background-color: #FFF9E6;
                  color: #C68B59;
                  border-radius: 9999px;
                  padding: 8px 18px;
                  font-weight: 800;
                  font-size: 13px;
                  border: 2px solid #FFEAA7;
                  cursor: pointer;
                  outline: none;
                  box-shadow: 0 4px 12px rgba(223,177,91,0.15);
                }
                .cutesy-dropdown option {
                  background-color: #FFF9E6;
                  color: #C68B59;
                  padding: 10px;
                  font-weight: 700;
                }
                .cutesy-dropdown option:hover, .cutesy-dropdown option:checked {
                  background-color: #FFEAA7 !important;
                  color: #5C3A21 !important;
                }
              `}</style>

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '20px', alignItems: 'stretch' }}>
                
                {/* FULLY DISPLAYED SMALLER ID CARD WITH SWIPE ANIMATION */}
                <div style={{ backgroundColor: '#FFF9E6', borderRadius: '32px', padding: '16px', boxShadow: '0 8px 25px rgba(223,177,91,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <div className={isSwipingID ? 'animate-swipe-id' : ''} style={{ width: '100%', maxWidth: '420px', aspectRatio: '1.58 / 1', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 25px rgba(223,177,91,0.25)', position: 'relative' }}>
                    <img 
                      src="https://i.imgur.com/VeQr3gX.png" 
                      alt="Company ID Pass" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                    />
                  </div>
                </div>

                {/* PUNCH CLOCK */}
                <div style={{ backgroundColor: '#FFF9E6', borderRadius: '32px', padding: '24px', boxShadow: '0 8px 25px rgba(223,177,91,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#C68B59', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Clock style={{ width: '16px', height: '16px' }} /> Butter Bear Punch Clock
                    </div>
                    <div className="butter-title" style={{ fontSize: '20px', color: '#5C3A21', marginBottom: '14px' }}>
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>

                    <button
                      onClick={handleTimeInToday}
                      style={{ backgroundColor: '#DFB15B', color: '#FFFFFF', borderRadius: '9999px', padding: '16px 24px', fontWeight: 800, fontSize: '16px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(223,177,91,0.35)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                      <Sparkles style={{ width: '20px', height: '20px' }} /> Time In For Today!
                    </button>
                  </div>

                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#8C7A6B', marginTop: '10px' }}>
                    Swipes ID pass & records your shift automatically!
                  </div>
                </div>
              </div>

              {/* CONTROLS & REAL-TIME USD/PHP RATE */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '28px', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', boxShadow: '0 6px 20px rgba(223,177,91,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#5C3A21' }}>Viewing Month:</span>
                  <select
                    value={attMonthIndex}
                    onChange={(e) => setAttMonthIndex(parseInt(e.target.value))}
                    style={{ backgroundColor: '#FFF3CD', borderRadius: '9999px', padding: '8px 16px', fontWeight: 800, color: '#C68B59', fontSize: '14px', cursor: 'pointer' }}
                  >
                    {months.map((m, idx) => (<option key={m} value={idx}>{m}</option>))}
                  </select>
                  <select
                    value={attYear}
                    onChange={(e) => setAttYear(parseInt(e.target.value))}
                    style={{ backgroundColor: '#FFF3CD', borderRadius: '9999px', padding: '8px 16px', fontWeight: 800, color: '#C68B59', fontSize: '14px', cursor: 'pointer' }}
                  >
                    {maxAttYears.map(y => (<option key={y} value={y}>{y}</option>))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '20px', fontSize: '13px', fontWeight: 800, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: '#C68B59', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Live USD/PHP: ₱{usdToPhpRate.toFixed(2)} 
                    {rateTrend === 'up' ? <ArrowUpRight style={{ width: '16px', height: '16px', color: '#2E7D32' }} /> : <ArrowDownRight style={{ width: '16px', height: '16px', color: '#C68B59' }} />}
                  </span>
                  <span style={{ color: '#2E7D32' }}>Worked Hours: {totalWorkedHours} hrs</span>
                  <span style={{ color: '#C68B59' }}>Total Estimated Salary: ₱{estimatedSalaryPHP.toLocaleString()}</span>
                </div>
              </div>

              {/* WORKING DAYS ATTENDANCE TABLE (MON-FRI) */}
              <div style={{ backgroundColor: '#FFEAA7', borderRadius: '28px', overflowX: 'auto', boxShadow: '0 8px 25px rgba(223,177,91,0.2)', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#FFF9E6', borderBottom: '3px dashed #DFB15B' }}>
                      <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 800, color: '#C68B59', textAlign: 'center' }}>Shift Date ({attMonthName} {attYear})</th>
                      <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 800, color: '#5C3A21', textAlign: 'center' }}>Day</th>
                      <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 800, color: '#5C3A21', textAlign: 'center' }}>Attendance / Time In</th>
                      <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 800, color: '#5C3A21', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 800, color: '#2E7D32', textAlign: 'center', backgroundColor: '#F4F9F4' }}>Worked Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workingDays.map((dayNum, i) => {
                      const dateObj = new Date(attYear, attMonthIndex, dayNum);
                      const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                      const mmStr = String(attMonthIndex + 1).padStart(2, '0');
                      const ddStr = String(dayNum).padStart(2, '0');
                      const dateKey = `${attYear}-${mmStr}-${ddStr}`;
                      const record = attendanceRecords[dateKey] || { timedIn: false, time: '-', status: '-', holidayOrLeave: '' };
                      const isTimedIn = !!record.timedIn;
                      const currentStatus = record.status || '-';

                      let activeWorkedHours = 0;
                      let statusBgColor = '#FFF9E6';
                      let statusTextColor = '#C68B59';

                      if (currentStatus === 'Present') {
                        activeWorkedHours = 8;
                        statusBgColor = '#C8E6C9';
                        statusTextColor = '#2E7D32';
                      } else if (currentStatus === 'Late') {
                        activeWorkedHours = 8;
                        statusBgColor = '#FFF9C4';
                        statusTextColor = '#F57F17';
                      } else if (currentStatus === 'Holiday' || currentStatus === 'Leave') {
                        statusBgColor = '#D7CCC8';
                        statusTextColor = '#4E342E';
                      } else if (currentStatus === 'Out of Shift') {
                        statusBgColor = '#FFECB3';
                        statusTextColor = '#E65100';
                      }

                      return (
                        <tr key={dateKey} style={{ borderBottom: '1px solid rgba(255,255,255,0.6)', backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.4)' : 'transparent' }}>
                          <td style={{ padding: '12px 20px', fontSize: '14px', fontWeight: 800, color: '#5C3A21', textAlign: 'center' }}>
                            {attMonthName} {dayNum}, {attYear}
                          </td>
                          <td style={{ padding: '12px 20px', fontSize: '14px', fontWeight: 700, color: '#5C3A21', textAlign: 'center' }}>
                            {dayOfWeek}
                          </td>
                          <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                            <button
                              onClick={() => {
                                const newTimedIn = !isTimedIn;
                                const now = new Date();
                                const timeString = newTimedIn ? now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : '-';
                                const evalStatus = newTimedIn ? evaluateStatusFromTime(now) : '-';
                                setAttendanceRecords(prev => ({
                                  ...prev,
                                  [dateKey]: { ...record, timedIn: newTimedIn, time: timeString, status: evalStatus }
                                }));
                              }}
                              style={{
                                borderRadius: '9999px',
                                padding: '8px 16px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: 800,
                                fontSize: '13px',
                                backgroundColor: isTimedIn ? '#FFF9E6' : 'rgba(255,255,255,0.8)',
                                color: isTimedIn ? '#2E7D32' : '#C68B59',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                              }}
                            >
                              <Star style={{ width: '18px', height: '18px', color: isTimedIn ? '#FFD700' : '#DFB15B', fill: isTimedIn ? '#FFD700' : 'none' }} />
                              {isTimedIn ? `Timed In (${record.time || 'Manual'})` : 'Click to Time In'}
                            </button>
                          </td>
                          <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                            <select
                              value={currentStatus}
                              onChange={(e) => handleUpdateDayStatus(dateKey, 'status', e.target.value)}
                              className="cutesy-dropdown"
                              style={{
                                backgroundColor: statusBgColor,
                                color: statusTextColor
                              }}
                            >
                              <option value="-">-</option>
                              <option value="Present">Present</option>
                              <option value="Late">Late</option>
                              <option value="Out of Shift">Out of Shift</option>
                              <option value="Holiday">Holiday</option>
                              <option value="Leave">Leave</option>
                            </select>
                          </td>
                          <td style={{ padding: '12px 20px', fontSize: '15px', fontWeight: 800, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.5)', color: activeWorkedHours > 0 ? '#2E7D32' : '#8C7A6B' }}>
                            {activeWorkedHours}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}