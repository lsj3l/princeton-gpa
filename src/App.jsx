import { useState, useMemo, useEffect } from 'react';
import {
  GraduationCap,
  Award,
  Sparkles,
  TrendingUp,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  Copy,
  Target,
  BookOpen,
  Calendar,
  Edit3,
  SlidersHorizontal,
  ChevronRight,
  Info
} from 'lucide-react';

// Princeton Grading Scale mapping up to A (4.0)
const GRADES = [
  { letter: 'F', points: 0.0, label: 'Failing' },
  { letter: 'D', points: 1.0, label: 'Minimum Passing' },
  { letter: 'C-', points: 1.7, label: 'Below Average' },
  { letter: 'C', points: 2.0, label: 'Average' },
  { letter: 'C+', points: 2.3, label: 'Satisfactory' },
  { letter: 'B-', points: 2.7, label: 'Above Average' },
  { letter: 'B', points: 3.0, label: 'Good' },
  { letter: 'B+', points: 3.3, label: 'Very Good' },
  { letter: 'A-', points: 3.7, label: 'Excellent' },
  { letter: 'A', points: 4.0, label: 'Outstanding' },
];

const SEMESTER_NAMES = [
  "Freshman Fall", "Freshman Spring",
  "Sophomore Fall", "Sophomore Spring",
  "Junior Fall", "Junior Spring",
  "Senior Fall", "Senior Spring"
];

const QUICK_COURSE_PRESETS = [
  "COS 126", "COS 217", "COS 226", "MAT 201", "MAT 202",
  "ECO 100", "PHY 103", "ORF 309", "WRI 150", "MOL 214"
];

const generateInitialCourses = () => {
  return Array(4).fill(null).map((_, i) => ({
    id: crypto.randomUUID(),
    name: `Course ${i + 1}`,
    credits: 4,
    gradeIndex: 9 // Default to 'A'
  }));
};

const STORAGE_KEY = 'princeton-gpa:v1';

const loadCalculator = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const valid = saved && Array.isArray(saved.semesters) && saved.semesters.length > 0
      && saved.semesters.every(semester =>
        semester && typeof semester.id === 'string' && typeof semester.name === 'string'
        && Array.isArray(semester.courses) && semester.courses.every(course =>
          course && typeof course.id === 'string' && typeof course.name === 'string'
          && [0, 4, 8].includes(course.credits)
          && Number.isInteger(course.gradeIndex)
          && course.gradeIndex >= 0 && course.gradeIndex < GRADES.length));

    if (valid) {
      return {
        semesters: saved.semesters,
        activeSemId: saved.semesters.some(semester => semester.id === saved.activeSemId)
          ? saved.activeSemId : saved.semesters[0].id,
      };
    }
  } catch {
    // Keep calculator usable if storage fails
  }

  const semesters = [{
    id: crypto.randomUUID(),
    name: SEMESTER_NAMES[0],
    courses: generateInitialCourses()
  }];
  return { semesters, activeSemId: semesters[0].id };
};

export default function App() {
  const [initialCalculator] = useState(loadCalculator);
  const [semesters, setSemesters] = useState(initialCalculator.semesters);
  const [activeSemId, setActiveSemId] = useState(initialCalculator.activeSemId);
  const [copied, setCopied] = useState(false);
  const [targetGPAInput, setTargetGPAInput] = useState('3.80');
  const [futureCoursesInput, setFutureCoursesInput] = useState('4');
  const [editingSemesterId, setEditingSemesterId] = useState(null);
  const [editingSemesterName, setEditingSemesterName] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ semesters, activeSemId }));
    } catch {
      // Storage unavailable fallback
    }
  }, [semesters, activeSemId]);

  // Calculations
  const calculateGPAStats = (courses) => {
    let totalQualityPoints = 0;
    let totalCredits = 0;
    courses.forEach(course => {
      totalQualityPoints += course.credits * GRADES[course.gradeIndex].points;
      totalCredits += course.credits;
    });
    const gpa = totalCredits === 0 ? "0.00" : (totalQualityPoints / totalCredits).toFixed(2);
    return { gpa, totalQualityPoints, totalCredits };
  };

  const activeSemester = semesters.find(s => s.id === activeSemId) || semesters[0];
  const activeSemesterIndex = semesters.findIndex(s => s.id === activeSemId);

  const activeSemesterStats = useMemo(() => {
    return calculateGPAStats(activeSemester.courses);
  }, [activeSemester]);

  const cumulativeStats = useMemo(() => {
    const allCourses = semesters.flatMap(s => s.courses);
    return calculateGPAStats(allCourses);
  }, [semesters]);

  // Honors standing estimation
  const cumulativeGPANum = parseFloat(cumulativeStats.gpa);
  const honorsTier = useMemo(() => {
    if (cumulativeStats.totalCredits === 0) return { label: 'No Graded Credits', color: 'text-neutral-400 bg-neutral-800/60 border-neutral-700/50' };
    if (cumulativeGPANum >= 3.90) return { label: 'Summa Cum Laude Track', color: 'text-amber-300 bg-amber-500/10 border-amber-500/30' };
    if (cumulativeGPANum >= 3.80) return { label: 'Magna Cum Laude Track', color: 'text-[#FF9A3C] bg-[#E77500]/10 border-[#E77500]/30' };
    if (cumulativeGPANum >= 3.70) return { label: 'Cum Laude Track', color: 'text-orange-300 bg-orange-500/10 border-orange-500/30' };
    if (cumulativeGPANum >= 3.50) return { label: 'High Academic Standing', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    if (cumulativeGPANum >= 2.00) return { label: 'Good Academic Standing', color: 'text-neutral-300 bg-neutral-800/80 border-neutral-700/50' };
    return { label: 'Academic Concern', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
  }, [cumulativeGPANum, cumulativeStats.totalCredits]);

  // What-If Target calculation
  const targetSimulation = useMemo(() => {
    const target = parseFloat(targetGPAInput);
    const futureCount = parseInt(futureCoursesInput) || 4;
    const futureCredits = futureCount * 4;

    if (isNaN(target) || target <= 0 || target > 4.0) {
      return { valid: false, message: 'Enter a valid target GPA (0.00 - 4.00)' };
    }

    const currentPoints = cumulativeStats.totalQualityPoints;
    const currentCredits = cumulativeStats.totalCredits;

    if (currentCredits === 0) {
      return { valid: true, requiredSemesterGPA: target.toFixed(2), possible: true };
    }

    const totalTargetPoints = target * (currentCredits + futureCredits);
    const neededPoints = totalTargetPoints - currentPoints;
    const requiredAvg = neededPoints / futureCredits;

    if (requiredAvg > 4.0) {
      return {
        valid: true,
        requiredSemesterGPA: requiredAvg.toFixed(2),
        possible: false,
        message: `Requires ${requiredAvg.toFixed(2)} (exceeds max 4.00). Try taking more credits or adjusting target.`
      };
    } else if (requiredAvg < 0) {
      return {
        valid: true,
        requiredSemesterGPA: "0.00",
        possible: true,
        message: `You have secured this threshold even with all D/F grades.`
      };
    } else {
      return {
        valid: true,
        requiredSemesterGPA: requiredAvg.toFixed(2),
        possible: true,
        message: `Need an average of ${requiredAvg.toFixed(2)} across the next ${futureCount} course(s).`
      };
    }
  }, [targetGPAInput, futureCoursesInput, cumulativeStats]);

  // Handlers
  const handleAddSemester = () => {
    const nextIndex = semesters.length;
    const name = nextIndex < SEMESTER_NAMES.length
      ? SEMESTER_NAMES[nextIndex]
      : `Semester ${nextIndex + 1}`;

    const newSem = {
      id: crypto.randomUUID(),
      name,
      courses: generateInitialCourses()
    };

    setSemesters([...semesters, newSem]);
    setActiveSemId(newSem.id);
  };

  const handleRemoveSemester = (id, e) => {
    if (e) e.stopPropagation();
    if (semesters.length === 1) return;

    const newSemesters = semesters.filter(s => s.id !== id);
    setSemesters(newSemesters);
    if (activeSemId === id) {
      setActiveSemId(newSemesters[newSemesters.length - 1].id);
    }
  };

  const handleStartRename = (sem, e) => {
    if (e) e.stopPropagation();
    setEditingSemesterId(sem.id);
    setEditingSemesterName(sem.name);
  };

  const handleSaveRename = () => {
    if (!editingSemesterId) return;
    const trimmed = editingSemesterName.trim() || 'Untitled Semester';
    setSemesters(semesters.map(s => s.id === editingSemesterId ? { ...s, name: trimmed } : s));
    setEditingSemesterId(null);
  };

  const handleAddCourse = () => {
    const updatedSemesters = semesters.map(sem => {
      if (sem.id !== activeSemId) return sem;
      return {
        ...sem,
        courses: [
          ...sem.courses,
          {
            id: crypto.randomUUID(),
            name: `Course ${sem.courses.length + 1}`,
            credits: 4,
            gradeIndex: 9
          }
        ]
      };
    });
    setSemesters(updatedSemesters);
  };

  const handleUpdateCourse = (courseId, field, value) => {
    const updatedSemesters = semesters.map(sem => {
      if (sem.id !== activeSemId) return sem;
      return {
        ...sem,
        courses: sem.courses.map(c => c.id === courseId ? { ...c, [field]: value } : c)
      };
    });
    setSemesters(updatedSemesters);
  };

  const handleRemoveCourse = (courseId) => {
    const updatedSemesters = semesters.map(sem => {
      if (sem.id !== activeSemId) return sem;
      return { ...sem, courses: sem.courses.filter(c => c.id !== courseId) };
    });
    setSemesters(updatedSemesters);
  };

  const handleResetCurrentSemester = () => {
    const updatedSemesters = semesters.map(sem => {
      if (sem.id !== activeSemId) return sem;
      return { ...sem, courses: generateInitialCourses() };
    });
    setSemesters(updatedSemesters);
  };

  const handleResetEntireCalculator = () => {
    if (window.confirm("Are you sure you want to reset all semesters and courses? This cannot be undone.")) {
      const resetSem = [{
        id: crypto.randomUUID(),
        name: SEMESTER_NAMES[0],
        courses: generateInitialCourses()
      }];
      setSemesters(resetSem);
      setActiveSemId(resetSem[0].id);
    }
  };

  const handleCopySummary = () => {
    const lines = [
      `🎓 Princeton University GPA Summary`,
      `Cumulative GPA: ${cumulativeStats.gpa} (${cumulativeStats.totalCredits} Graded Credits)`,
      `Academic Standing: ${honorsTier.label}`,
      ``,
      `--- Breakdown by Semester ---`
    ];

    semesters.forEach(s => {
      const stats = calculateGPAStats(s.courses);
      lines.push(`${s.name}: ${stats.gpa} GPA (${stats.totalCredits} credits, ${s.courses.length} courses)`);
      s.courses.forEach(c => {
        lines.push(`  • ${c.name}: ${GRADES[c.gradeIndex].letter} (${c.credits} cr)`);
      });
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#09090c] text-neutral-100 flex flex-col selection:bg-[#E77500] selection:text-black">
      {/* Subtle top ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-48 bg-gradient-to-b from-[#E77500]/10 via-[#E77500]/3 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0c0c11]/85 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-8 py-3.5 shadow-xl transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E77500] to-[#b35700] p-[1.5px] shadow-[0_0_15px_rgba(231,117,0,0.3)] flex items-center justify-center">
              <div className="w-full h-full bg-[#0e0e14] rounded-[10px] flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-[#E77500]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                  Princeton <span className="text-[#E77500]">GPA</span>
                </h1>
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-400 border border-white/[0.06]">
                  4.0 Scale
                </span>
              </div>
              <p className="text-xs text-neutral-400 hidden sm:block">
                Princeton University Undergraduate Academic Calculator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/[0.08] text-xs font-semibold transition-all cursor-pointer"
              title="Copy formatted summary to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
              <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
            </button>

            <button
              onClick={handleResetEntireCalculator}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.02] hover:bg-rose-500/10 text-neutral-400 hover:text-rose-400 border border-white/[0.05] hover:border-rose-500/20 text-xs font-semibold transition-all cursor-pointer"
              title="Reset all semesters and courses"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset All</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Analytics & Stats Dashboard */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Cumulative GPA */}
          <div className="relative overflow-hidden rounded-2xl bg-[#121218]/90 border border-[#E77500]/25 p-5 shadow-lg shadow-black/40 group hover:border-[#E77500]/45 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E77500]/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
            <div className="flex items-center justify-between text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E77500]" />
                Cumulative GPA
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                {cumulativeStats.totalCredits} Credits
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white group-hover:text-[#FF9A3C] transition-colors">
                {cumulativeStats.gpa}
              </span>
              <span className="text-sm font-mono text-neutral-400 font-semibold">/ 4.00</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${honorsTier.color}`}>
                {honorsTier.label}
              </span>
            </div>
          </div>

          {/* Card 2: Current Semester GPA */}
          <div className="relative overflow-hidden rounded-2xl bg-[#121218]/90 border border-white/[0.08] p-5 shadow-lg shadow-black/40 hover:border-white/[0.15] transition-all">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-300" />
                Active Semester
              </span>
              <span className="text-[11px] font-mono text-neutral-400 truncate max-w-[160px]">
                {activeSemester.name}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white">
                {activeSemesterStats.gpa}
              </span>
              <span className="text-sm font-mono text-neutral-400 font-semibold">/ 4.00</span>
            </div>
            <div className="text-xs text-neutral-400 flex items-center gap-2 font-mono">
              <span>{activeSemesterStats.totalCredits} cr</span>
              <span>•</span>
              <span>{activeSemester.courses.length} courses</span>
              <span>•</span>
              <span>{activeSemesterStats.totalQualityPoints.toFixed(1)} pts</span>
            </div>
          </div>

          {/* Card 3: Princeton Latin Honors Reference */}
          <div className="relative overflow-hidden rounded-2xl bg-[#121218]/90 border border-white/[0.08] p-5 shadow-lg shadow-black/40 hover:border-white/[0.15] transition-all">
            <div className="flex items-center justify-between text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#E77500]" />
                Honors Benchmarks
              </span>
              <span className="text-[10px] text-neutral-400">Princeton Scale</span>
            </div>
            <div className="space-y-1.5 mt-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-300 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${cumulativeGPANum >= 3.90 ? 'bg-amber-400' : 'bg-neutral-600'}`} />
                  Summa Cum Laude
                </span>
                <span className="font-mono text-neutral-400 font-semibold">≥ 3.90</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-300 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${cumulativeGPANum >= 3.80 ? 'bg-[#E77500]' : 'bg-neutral-600'}`} />
                  Magna Cum Laude
                </span>
                <span className="font-mono text-neutral-400 font-semibold">≥ 3.80</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-300 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${cumulativeGPANum >= 3.70 ? 'bg-orange-400' : 'bg-neutral-600'}`} />
                  Cum Laude
                </span>
                <span className="font-mono text-neutral-400 font-semibold">≥ 3.70</span>
              </div>
            </div>
          </div>

          {/* Card 4: What-If Target Planner */}
          <div className="relative overflow-hidden rounded-2xl bg-[#121218]/90 border border-white/[0.08] p-5 shadow-lg shadow-black/40 hover:border-white/[0.15] transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-[#E77500]" />
                  Goal Simulator
                </span>
                <span className="text-[10px] text-neutral-400">What-If</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-[10px] text-neutral-400 font-mono block mb-1">Target GPA</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.0"
                    max="4.0"
                    value={targetGPAInput}
                    onChange={(e) => setTargetGPAInput(e.target.value)}
                    className="w-full bg-[#181822] border border-white/[0.1] rounded-lg px-2.5 py-1 text-sm font-mono font-bold text-white focus:outline-none focus:border-[#E77500]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 font-mono block mb-1">Upcoming Courses</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={futureCoursesInput}
                    onChange={(e) => setFutureCoursesInput(e.target.value)}
                    className="w-full bg-[#181822] border border-white/[0.1] rounded-lg px-2.5 py-1 text-sm font-mono font-bold text-white focus:outline-none focus:border-[#E77500]"
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="text-neutral-400">Needed GPA:</span>
                <span className={`font-bold text-sm ${targetSimulation.possible ? 'text-[#FF9A3C]' : 'text-rose-400'}`}>
                  {targetSimulation.requiredSemesterGPA || '—'}
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1 line-clamp-1">
                {targetSimulation.message}
              </p>
            </div>
          </div>
        </section>

        {/* Semester Navigation Bar */}
        <section className="bg-[#121218]/90 border border-white/[0.08] rounded-2xl p-2 sm:p-2.5 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            {/* Scrollable Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 py-0.5">
              {semesters.map((sem, idx) => {
                const isActive = activeSemId === sem.id;
                const stats = calculateGPAStats(sem.courses);
                const isEditing = editingSemesterId === sem.id;

                return (
                  <div
                    key={sem.id}
                    onClick={() => setActiveSemId(sem.id)}
                    className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-all border ${
                      isActive
                        ? 'bg-gradient-to-r from-[#E77500]/20 to-[#E77500]/10 border-[#E77500]/40 text-white shadow-sm'
                        : 'bg-[#181822]/60 hover:bg-[#181822] text-neutral-400 hover:text-neutral-200 border-white/[0.05]'
                    }`}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingSemesterName}
                        onChange={(e) => setEditingSemesterName(e.target.value)}
                        onBlur={handleSaveRename}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                        className="bg-black/50 text-white border border-[#E77500] rounded px-1.5 py-0.5 outline-none font-medium w-28 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="font-medium tracking-tight">
                        {sem.name}
                      </span>
                    )}

                    {/* Semester GPA Pill */}
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-[#E77500]/30 text-amber-200'
                          : 'bg-white/[0.06] text-neutral-400'
                      }`}
                    >
                      {stats.gpa}
                    </span>

                    {/* Rename icon when active */}
                    {isActive && !isEditing && (
                      <button
                        onClick={(e) => handleStartRename(sem, e)}
                        className="opacity-0 group-hover:opacity-100 hover:text-neutral-200 transition-opacity p-0.5 rounded"
                        title="Rename Semester"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}

                    {/* Delete Semester */}
                    {semesters.length > 1 && (
                      <button
                        onClick={(e) => handleRemoveSemester(sem.id, e)}
                        className={`p-0.5 rounded-full transition-colors ${
                          isActive
                            ? 'text-neutral-400 hover:text-rose-400 hover:bg-rose-500/20'
                            : 'opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-rose-400'
                        }`}
                        title="Delete this semester"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Semester Button */}
            <button
              onClick={handleAddSemester}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E77500]/15 hover:bg-[#E77500]/25 text-[#FF9A3C] hover:text-white border border-[#E77500]/30 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-sm"
              title="Add a new semester"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Add Semester</span>
            </button>
          </div>
        </section>

        {/* Active Semester Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>{activeSemester.name}</span>
                <button
                  onClick={(e) => handleStartRename(activeSemester, e)}
                  className="text-neutral-500 hover:text-neutral-300 transition-colors p-1"
                  title="Rename Semester"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </h2>
              <span className="text-xs font-mono text-neutral-400">
                ({activeSemester.courses.length} {activeSemester.courses.length === 1 ? 'course' : 'courses'} · {activeSemesterStats.totalCredits} credits)
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Select or slide grades and adjust course credit weights. Standard Princeton courses count as 4 credits.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleResetCurrentSemester}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-neutral-200 border border-white/[0.06] text-xs font-semibold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Semester
            </button>
            <button
              onClick={handleAddCourse}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#E77500] to-[#FF8A00] hover:from-[#f07b00] hover:to-[#ffa024] text-neutral-950 font-bold text-xs shadow-[0_0_15px_rgba(231,117,0,0.3)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Add Course
            </button>
          </div>
        </div>

        {/* Course Cards List */}
        <section className="space-y-3">
          {activeSemester.courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.1] p-12 text-center bg-[#121218]/40">
              <BookOpen className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-neutral-300">No courses in this semester yet</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                Add your Princeton courses to calculate your semester GPA and track your cumulative academic progress.
              </p>
              <button
                onClick={handleAddCourse}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E77500] text-black font-bold text-xs hover:bg-[#FF8A00] transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" /> Add First Course
              </button>
            </div>
          ) : (
            activeSemester.courses.map((course, index) => {
              const currentGrade = GRADES[course.gradeIndex];
              const percentage = (course.gradeIndex / (GRADES.length - 1)) * 100;

              // Color badge helper
              const isA = currentGrade.letter.startsWith('A');
              const isB = currentGrade.letter.startsWith('B');
              const isC = currentGrade.letter.startsWith('C');

              const gradeColorClass = isA
                ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
                : isB
                ? 'text-[#FF9A3C] border-[#E77500]/40 bg-[#E77500]/10'
                : isC
                ? 'text-sky-300 border-sky-500/30 bg-sky-500/10'
                : 'text-rose-400 border-rose-500/30 bg-rose-500/10';

              return (
                <div
                  key={course.id}
                  className="group relative rounded-2xl bg-[#121218]/90 hover:bg-[#14141c] border border-white/[0.08] hover:border-white/[0.16] p-4 sm:p-5 transition-all shadow-md hover:shadow-xl"
                >
                  {/* Top Bar inside Card */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                    {/* Course Title and Quick Presets */}
                    <div className="flex-1 w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-white/[0.05] border border-white/[0.05] flex items-center justify-center text-[11px] font-mono font-bold text-neutral-400">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={course.name}
                          onChange={(e) => handleUpdateCourse(course.id, 'name', e.target.value)}
                          placeholder="e.g. COS 226, MAT 201, ECO 100"
                          className="bg-transparent text-sm sm:text-base font-bold text-white placeholder-neutral-500 focus:outline-none focus:border-b focus:border-[#E77500] py-0.5 flex-1 min-w-[140px]"
                        />
                      </div>
                      {/* Princeton Preset Hints */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-neutral-400 font-mono">Suggested:</span>
                        {QUICK_COURSE_PRESETS.slice(index * 2, index * 2 + 3).map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleUpdateCourse(course.id, 'name', preset)}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-[#E77500]/20 text-neutral-400 hover:text-amber-200 border border-white/[0.04] transition-colors cursor-pointer"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Credit Pills, Grade Badge & Delete */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
                      {/* Credit Hours Segmented Selector */}
                      <div className="flex items-center p-1 rounded-xl bg-[#0e0e14] border border-white/[0.06] text-xs font-mono">
                        <span className="text-[10px] text-neutral-400 px-1.5 uppercase font-sans font-bold">Credits:</span>
                        {[
                          { label: '0', val: 0, title: 'Audit / Pass-D-Fail (PDF)' },
                          { label: '4', val: 4, title: 'Standard Princeton Course (1.0 Unit)' },
                          { label: '8', val: 8, title: 'Double / Senior Thesis' }
                        ].map(cOption => (
                          <button
                            key={cOption.val}
                            type="button"
                            onClick={() => handleUpdateCourse(course.id, 'credits', cOption.val)}
                            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              course.credits === cOption.val
                                ? 'bg-[#E77500] text-black shadow-sm'
                                : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                            title={cOption.title}
                          >
                            {cOption.label}
                          </button>
                        ))}
                      </div>

                      {/* Grade Badge */}
                      <div className={`flex items-baseline gap-1 px-3 py-1 rounded-xl border font-mono ${gradeColorClass}`}>
                        <span className="text-lg font-black">{currentGrade.letter}</span>
                        <span className="text-xs font-bold opacity-80">({currentGrade.points.toFixed(1)})</span>
                      </div>

                      {/* Remove Course */}
                      <button
                        onClick={() => handleRemoveCourse(course.id)}
                        className="text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 p-2 rounded-xl transition-all cursor-pointer"
                        title="Remove Course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Interactive Grade Picker: Fast Pill Strip + Slider */}
                  <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
                    {/* Fast Click Grade Pills */}
                    <div className="grid grid-cols-10 gap-1 text-center font-mono">
                      {GRADES.map((g, gIdx) => {
                        const isSelected = course.gradeIndex === gIdx;
                        return (
                          <button
                            key={g.letter}
                            type="button"
                            onClick={() => handleUpdateCourse(course.id, 'gradeIndex', gIdx)}
                            className={`py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-gradient-to-t from-[#E77500] to-[#FF8A00] text-black border-[#FF8A00] font-black shadow-[0_0_10px_rgba(231,117,0,0.4)] scale-105'
                                : 'bg-[#181822]/60 hover:bg-[#20202c] text-neutral-400 hover:text-white border-white/[0.04]'
                            }`}
                            title={`${g.letter} (${g.points.toFixed(1)} pts) - ${g.label}`}
                          >
                            {g.letter}
                          </button>
                        );
                      })}
                    </div>

                    {/* Smooth Stepped Range Slider */}
                    <div className="relative pt-1 px-1">
                      <input
                        type="range"
                        min="0"
                        max={GRADES.length - 1}
                        step="1"
                        value={course.gradeIndex}
                        onChange={(e) => handleUpdateCourse(course.id, 'gradeIndex', parseInt(e.target.value))}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer grade-slider outline-none"
                        style={{
                          background: `linear-gradient(to right, #E77500 ${percentage}%, #23232e ${percentage}%)`
                        }}
                      />
                      <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 mt-1">
                        <span>F (0.0)</span>
                        <span className="text-[#FF9A3C] font-semibold">{currentGrade.label}</span>
                        <span>A (4.0)</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* Bottom Quick Add / Action Row */}
        {activeSemester.courses.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={handleAddCourse}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-dashed border-neutral-700 hover:border-[#E77500]/60 bg-[#121218]/50 hover:bg-[#E77500]/5 text-neutral-300 hover:text-[#FF9A3C] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> Add Another Course
            </button>

            <div className="text-xs text-neutral-400 font-mono text-center sm:text-right">
              Tip: Click any letter pill or drag the orange slider for rapid grading
            </div>
          </div>
        )}

        {/* Princeton Academic Policy & Grading Scale Reference Footer */}
        <footer className="pt-8 pb-12 border-t border-white/[0.08] text-neutral-400 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                Princeton Grading Scale
              </h4>
              <p className="text-[11px] leading-relaxed text-neutral-400">
                Princeton calculates cumulative GPA on a 4.000 scale. Grades are weighted by course credits. Audited and PDF (Pass/D/Fail) courses with 0 credits do not affect GPA points.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                Course Units & Weights
              </h4>
              <p className="text-[11px] leading-relaxed text-neutral-400">
                Standard undergraduate courses carry 1.0 course credit (represented as 4.0 semester hours). Senior theses, independent work, and certain double-credit courses carry 8.0 semester hours.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                Undergraduate Latin Honors
              </h4>
              <p className="text-[11px] leading-relaxed text-neutral-400">
                Latin Honors (<span className="text-amber-300 font-semibold">Summa</span>, <span className="text-[#FF9A3C] font-semibold">Magna</span>, <span className="text-orange-300 font-semibold">Cum Laude</span>) are determined based on departmental standing and cumulative grade averages.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-400 gap-2">
            <span>Designed for Princeton University undergraduates. All calculations saved locally in your browser.</span>
            <span className="font-mono">Princeton University · Office of the Registrar Scale</span>
          </div>
        </footer>

      </main>
    </div>
  );
}
