import { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  RotateCcw,
  Check,
  Copy,
  Edit3,
  X
} from 'lucide-react';

// Official Princeton Grading Scale mapping up to A (4.0)
const GRADES = [
  { letter: 'F', points: 0.0, label: 'Failing' },
  { letter: 'D', points: 1.0, label: 'Passing' },
  { letter: 'C-', points: 1.7, label: 'Below Avg' },
  { letter: 'C', points: 2.0, label: 'Average' },
  { letter: 'C+', points: 2.3, label: 'Satisfactory' },
  { letter: 'B-', points: 2.7, label: 'Above Avg' },
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

const DEFAULT_COURSE_NAMES = [
  "COS 126", "MAT 201", "ECO 100", "PHY 103"
];

const generateInitialCourses = () => {
  return Array(4).fill(null).map((_, i) => ({
    id: crypto.randomUUID(),
    name: DEFAULT_COURSE_NAMES[i] || `Course ${i + 1}`,
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
    // Storage unavailable fallback
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
  const [editingSemesterId, setEditingSemesterId] = useState(null);
  const [editingSemesterName, setEditingSemesterName] = useState('');
  const [targetGPA, setTargetGPA] = useState('3.80');
  const [upcomingCourses, setUpcomingCourses] = useState('4');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ semesters, activeSemId }));
    } catch {
      // Storage unavailable fallback
    }
  }, [semesters, activeSemId]);

  // Statistics Calculation
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

  const activeSemesterStats = useMemo(() => {
    return calculateGPAStats(activeSemester.courses);
  }, [activeSemester]);

  const cumulativeStats = useMemo(() => {
    const allCourses = semesters.flatMap(s => s.courses);
    return calculateGPAStats(allCourses);
  }, [semesters]);

  // Honors standing
  const cumulativeGPANum = parseFloat(cumulativeStats.gpa);
  const honorsLabel = useMemo(() => {
    if (cumulativeStats.totalCredits === 0) return 'NO GRADED CREDITS';
    if (cumulativeGPANum >= 3.90) return 'SUMMA CUM LAUDE';
    if (cumulativeGPANum >= 3.80) return 'MAGNA CUM LAUDE';
    if (cumulativeGPANum >= 3.70) return 'CUM LAUDE';
    if (cumulativeGPANum >= 3.50) return 'DEAN’S COMMENDATION';
    if (cumulativeGPANum >= 2.00) return 'GOOD STANDING';
    return 'ACADEMIC WARNING';
  }, [cumulativeGPANum, cumulativeStats.totalCredits]);

  // What-If Needed GPA Calculation
  const neededSemesterGPA = useMemo(() => {
    const target = parseFloat(targetGPA);
    const count = parseInt(upcomingCourses) || 4;
    const futureCredits = count * 4;

    if (isNaN(target) || target <= 0 || target > 4.0) return null;
    if (cumulativeStats.totalCredits === 0) return target.toFixed(2);

    const neededPoints = (target * (cumulativeStats.totalCredits + futureCredits)) - cumulativeStats.totalQualityPoints;
    const required = neededPoints / futureCredits;
    return required.toFixed(2);
  }, [targetGPA, upcomingCourses, cumulativeStats]);

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

  const handleResetAll = () => {
    if (window.confirm("Reset all semesters and courses to initial state?")) {
      const reset = [{
        id: crypto.randomUUID(),
        name: SEMESTER_NAMES[0],
        courses: generateInitialCourses()
      }];
      setSemesters(reset);
      setActiveSemId(reset[0].id);
    }
  };

  const handleCopySummary = () => {
    const lines = [
      `PRINCETON GPA SUMMARY`,
      `Cumulative GPA: ${cumulativeStats.gpa} / 4.00 (${cumulativeStats.totalCredits} Credits)`,
      `Academic Standing: ${honorsLabel}`,
      ``,
      `--- Semesters ---`
    ];

    semesters.forEach((s, i) => {
      const stats = calculateGPAStats(s.courses);
      lines.push(`${String(i + 1).padStart(2, '0')} ${s.name}: ${stats.gpa} GPA (${stats.totalCredits} cr)`);
      s.courses.forEach(c => {
        lines.push(`   - ${c.name || 'Untitled'}: ${GRADES[c.gradeIndex].letter} (${c.credits} cr)`);
      });
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[#f5f4f1] font-sans antialiased flex flex-col selection:bg-[#ed6829] selection:text-black overflow-x-hidden w-full max-w-full">
      {/* Top Header */}
      <header className="border-b border-white/10 px-3.5 sm:px-8 py-3.5 sm:py-4 bg-[#080808] sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="w-2.5 h-2.5 bg-[#ed6829] shrink-0 inline-block" />
            <div className="truncate">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white whitespace-nowrap">
                  Princeton
                </span>
                <span className="text-neutral-600 font-mono text-xs">/</span>
                <span className="font-mono text-xs text-neutral-400 uppercase tracking-wider sm:tracking-widest whitespace-nowrap">
                  GPA Planner
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#111] hover:bg-[#181818] text-neutral-300 hover:text-white border border-white/10 text-[11px] font-mono uppercase tracking-wider transition-colors cursor-pointer"
              title="Copy Summary"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#ed6829]" /> : <Copy className="w-3.5 h-3.5 text-neutral-500" />}
              <span className="hidden xs:inline sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleResetAll}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#111] hover:bg-[#181818] text-neutral-400 hover:text-neutral-200 border border-white/10 text-[11px] font-mono uppercase tracking-wider transition-colors cursor-pointer"
              title="Reset All"
            >
              <RotateCcw className="w-3 h-3 text-neutral-500" />
              <span className="hidden xs:inline sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3.5 sm:p-8 space-y-6 sm:space-y-8 box-border">

        {/* Hero Architectural Stats Board */}
        <section className="border border-white/10 bg-[#0d0d0d] divide-y sm:divide-y-0 sm:divide-x divide-white/10 grid grid-cols-1 sm:grid-cols-2">
          {/* Cumulative GPA */}
          <div className="p-4 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="font-mono text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase text-neutral-400">
                  Cumulative GPA
                </span>
                <span className="font-mono text-[10px] text-neutral-400">
                  {cumulativeStats.totalCredits.toFixed(1)} Credits
                </span>
              </div>
              <div className="flex items-baseline gap-2 sm:gap-3">
                <span className="font-mono text-5xl sm:text-7xl font-light tracking-tight text-white">
                  {cumulativeStats.gpa}
                </span>
                <span className="font-mono text-xs sm:text-sm text-neutral-400">/ 4.00</span>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/5 flex items-center justify-between font-mono text-[10px]">
              <span className="text-[#ed6829] font-medium tracking-wider">
                {honorsLabel}
              </span>
              <span className="text-neutral-400 uppercase">
                Princeton Scale
              </span>
            </div>
          </div>

          {/* Active Semester GPA */}
          <div className="p-4 sm:p-8 flex flex-col justify-between bg-[#101010]">
            <div>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="font-mono text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase text-neutral-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#ed6829]" />
                  Active Semester
                </span>
                <span className="font-mono text-[10px] text-neutral-300 uppercase truncate max-w-[150px]">
                  {activeSemester.name}
                </span>
              </div>
              <div className="flex items-baseline gap-2 sm:gap-3">
                <span className="font-mono text-5xl sm:text-7xl font-light tracking-tight text-white">
                  {activeSemesterStats.gpa}
                </span>
                <span className="font-mono text-xs sm:text-sm text-neutral-400">/ 4.00</span>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/5 flex items-center justify-between font-mono text-[10px] text-neutral-400">
              <span>{activeSemesterStats.totalCredits.toFixed(1)} HRS</span>
              <span>{activeSemester.courses.length} COURSES</span>
              <span>{activeSemesterStats.totalQualityPoints.toFixed(1)} PTS</span>
            </div>
          </div>
        </section>

        {/* Semester Timeline / Tabs */}
        <section className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
              Semesters
            </span>
            <button
              onClick={handleAddSemester}
              className="flex items-center gap-1 text-[11px] font-mono text-[#ed6829] hover:text-[#ff8550] transition-colors cursor-pointer py-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Semester</span>
            </button>
          </div>

          <div className="relative">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 scroll-smooth">
              {semesters.map((sem, idx) => {
                const isActive = activeSemId === sem.id;
                const stats = calculateGPAStats(sem.courses);
                const isEditing = editingSemesterId === sem.id;

                return (
                  <div
                    key={sem.id}
                    onClick={() => setActiveSemId(sem.id)}
                    className={`group flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 border text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'border-[#ed6829] bg-[#141414] text-white shadow-sm'
                        : 'border-white/10 bg-[#0d0d0d] text-neutral-400 hover:text-neutral-200 hover:border-white/20'
                    }`}
                  >
                    <span className={`text-[10px] ${isActive ? 'text-[#ed6829]' : 'text-neutral-400'}`}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>

                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingSemesterName}
                        onChange={(e) => setEditingSemesterName(e.target.value)}
                        onBlur={handleSaveRename}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                        className="bg-black text-white border border-[#ed6829] px-1 py-0.5 outline-none font-mono text-xs w-28"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="font-medium">
                        {sem.name}
                      </span>
                    )}

                    <span className={`text-[11px] font-mono ${isActive ? 'text-white font-semibold' : 'text-neutral-400'}`}>
                      {stats.gpa}
                    </span>

                    {isActive && !isEditing && (
                      <button
                        onClick={(e) => handleStartRename(sem, e)}
                        className="p-1 text-neutral-400 hover:text-white transition-opacity"
                        title="Rename"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}

                    {semesters.length > 1 && (
                      <button
                        onClick={(e) => handleRemoveSemester(sem.id, e)}
                        className="p-1 text-neutral-400 hover:text-rose-400 transition-colors"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Subtle overflow fade indicator on mobile */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-6 bg-gradient-to-l from-[#080808] to-transparent sm:hidden" />
          </div>
        </section>

        {/* Active Semester Course Section Header */}
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0">
              <h2 className="text-base sm:text-lg font-medium text-white flex items-center gap-1.5 truncate">
                <span className="truncate">{activeSemester.name}</span>
                <button
                  onClick={(e) => handleStartRename(activeSemester, e)}
                  className="text-neutral-400 hover:text-white transition-colors p-1 shrink-0"
                  title="Rename"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </h2>
              <span className="font-mono text-[11px] sm:text-xs text-neutral-400 shrink-0">
                {activeSemester.courses.length} courses · {activeSemesterStats.totalCredits} credits
              </span>
            </div>

            <button
              onClick={handleAddCourse}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-[#ed6829] hover:bg-[#ff7b3d] text-black font-mono text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Course</span>
            </button>
          </div>

          {/* Courses List */}
          <div className="space-y-3 sm:space-y-2">
            {activeSemester.courses.map((course, index) => {
              const currentGrade = GRADES[course.gradeIndex];

              return (
                <div
                  key={course.id}
                  className="border border-white/10 bg-[#111111] hover:border-white/20 p-3.5 sm:p-4 transition-colors group box-border w-full"
                >
                  {/* Top: Course Title / Code */}
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <span className="font-mono text-xs text-neutral-400 w-5 shrink-0">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <input
                      type="text"
                      value={course.name}
                      onChange={(e) => handleUpdateCourse(course.id, 'name', e.target.value)}
                      placeholder="Course Code / Title"
                      className="bg-transparent font-medium text-sm sm:text-base text-white placeholder:text-neutral-600 focus:outline-none focus:border-b focus:border-[#ed6829] py-0.5 flex-1 min-w-0"
                    />
                  </div>

                  {/* Mid Bar: Hours Selector, Grade Display, Delete Button */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-white/5">
                    {/* Credit Selector (Segmented control) */}
                    <div className="flex items-center border border-white/10 bg-[#080808] text-[11px] font-mono">
                      <span className="text-neutral-400 px-2 uppercase text-[9px] sm:text-[10px]">Hrs</span>
                      {[
                        { val: 0, label: '0' },
                        { val: 4, label: '4' },
                        { val: 8, label: '8' }
                      ].map(c => (
                        <button
                          key={c.val}
                          type="button"
                          onClick={() => handleUpdateCourse(course.id, 'credits', c.val)}
                          className={`px-3 py-1.5 sm:px-2.5 sm:py-1 min-h-[36px] sm:min-h-0 min-w-[32px] sm:min-w-0 font-semibold transition-colors cursor-pointer flex items-center justify-center ${
                            course.credits === c.val
                              ? 'bg-white text-black'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Grade Value Display */}
                      <div className="flex items-baseline gap-1.5 px-2.5 py-1 sm:px-3 border border-white/10 bg-[#161616] font-mono min-h-[36px] sm:min-h-0 items-center">
                        <span className="text-base font-bold text-[#ed6829]">{currentGrade.letter}</span>
                        <span className="text-xs text-neutral-400">{currentGrade.points.toFixed(1)}</span>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveCourse(course.id)}
                        className="text-neutral-400 hover:text-rose-400 p-2 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-white/10"
                        title="Delete Course"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Responsive Grade Buttons (5 cols on mobile, 10 on desktop) */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-1 font-mono text-center w-full">
                      {GRADES.map((g, gIdx) => {
                        const isSelected = course.gradeIndex === gIdx;
                        return (
                          <button
                            key={g.letter}
                            type="button"
                            onClick={() => handleUpdateCourse(course.id, 'gradeIndex', gIdx)}
                            className={`py-2 sm:py-1 min-h-[38px] sm:min-h-0 text-xs sm:text-[11px] font-mono transition-colors cursor-pointer border flex items-center justify-center ${
                              isSelected
                                ? 'border-[#ed6829] bg-[#ed6829] text-black font-bold'
                                : 'border-white/5 bg-[#0a0a0a] text-neutral-400 hover:text-white hover:border-white/20'
                            }`}
                          >
                            {g.letter}
                          </button>
                        );
                      })}
                    </div>

                    {/* Stepped Hardware Fader */}
                    <div className="relative pt-1">
                      <input
                        type="range"
                        min="0"
                        max={GRADES.length - 1}
                        step="1"
                        value={course.gradeIndex}
                        onChange={(e) => handleUpdateCourse(course.id, 'gradeIndex', parseInt(e.target.value))}
                        className="hardware-slider"
                      />
                      <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400">
                        <span>F (0.0)</span>
                        <span className="text-neutral-300 font-medium">{currentGrade.label}</span>
                        <span>A (4.0)</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleAddCourse}
            className="w-full py-3.5 sm:py-3 border border-dashed border-white/10 hover:border-white/30 text-neutral-400 hover:text-white text-xs font-mono uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            <Plus className="w-3.5 h-3.5" /> Add Course
          </button>
        </section>

        {/* Minimal Goal Target Strip */}
        <section className="border border-white/10 bg-[#0c0c0c] p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 font-mono text-xs">
          <div className="flex items-center gap-2 text-neutral-400">
            <span className="w-1.5 h-1.5 bg-[#ed6829]" />
            <span className="uppercase tracking-wider font-semibold text-white">Target Simulator:</span>
            <span className="text-neutral-400 hidden sm:inline">What GPA do you need?</span>
          </div>

          <div className="flex flex-wrap items-center justify-between w-full sm:w-auto gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 text-[10px] uppercase">Target</span>
              <input
                type="number"
                step="0.01"
                min="1.0"
                max="4.0"
                value={targetGPA}
                onChange={(e) => setTargetGPA(e.target.value)}
                className="w-16 bg-[#161616] border border-white/10 text-white font-mono text-xs px-2 py-1.5 sm:py-1 min-h-[36px] sm:min-h-0 outline-none focus:border-[#ed6829]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 text-[10px] uppercase">Courses</span>
              <input
                type="number"
                min="1"
                max="20"
                value={upcomingCourses}
                onChange={(e) => setUpcomingCourses(e.target.value)}
                className="w-14 bg-[#161616] border border-white/10 text-white font-mono text-xs px-2 py-1.5 sm:py-1 min-h-[36px] sm:min-h-0 outline-none focus:border-[#ed6829]"
              />
            </div>

            <div className="flex items-center gap-2 pl-2 sm:border-l border-white/10">
              <span className="text-neutral-400 text-[10px] uppercase">Needed Avg:</span>
              <span className="text-sm font-bold text-[#ed6829]">
                {neededSemesterGPA ? `${neededSemesterGPA}` : '—'}
              </span>
            </div>
          </div>
        </section>

        {/* Simple Architectural Footer */}
        <footer className="pt-6 pb-12 border-t border-white/10 font-mono text-[10px] text-neutral-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            PRINCETON UNIVERSITY UNDERGRADUATE SCALE (A = 4.0, A- = 3.7, B+ = 3.3, B = 3.0, B- = 2.7, C+ = 2.3, C = 2.0, C- = 1.7, D = 1.0, F = 0.0)
          </div>
          <div className="text-neutral-400">
            AUTOSAVED LOCALLY
          </div>
        </footer>

      </main>
    </div>
  );
}
