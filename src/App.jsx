import { useState, useMemo, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

// Princeton Grading Scale mapping up to A (4.0)
const GRADES = [
  { letter: 'F', points: 0.0 },
  { letter: 'D', points: 1.0 },
  { letter: 'C-', points: 1.7 },
  { letter: 'C', points: 2.0 },
  { letter: 'C+', points: 2.3 },
  { letter: 'B-', points: 2.7 },
  { letter: 'B', points: 3.0 },
  { letter: 'B+', points: 3.3 },
  { letter: 'A-', points: 3.7 },
  { letter: 'A', points: 4.0 },
];

const SEMESTER_NAMES = [
  "Freshman Fall", "Freshman Spring",
  "Sophomore Fall", "Sophomore Spring",
  "Junior Fall", "Junior Spring",
  "Senior Fall", "Senior Spring"
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
    // Unavailable storage or invalid saved data should not prevent using the calculator.
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ semesters, activeSemId }));
    } catch {
      // Keep the calculator usable when browser storage is blocked or full.
    }
  }, [semesters, activeSemId]);

  // --- Logic & Calculations ---

  const calculateGPA = (courses) => {
    let totalPoints = 0;
    let totalCredits = 0;
    courses.forEach(course => {
      totalPoints += course.credits * GRADES[course.gradeIndex].points;
      totalCredits += course.credits;
    });
    return totalCredits === 0 ? "0.00" : (totalPoints / totalCredits).toFixed(2);
  };

  const activeSemester = semesters.find(s => s.id === activeSemId) || semesters[0];
  const semesterGPA = useMemo(() => calculateGPA(activeSemester.courses), [activeSemester]);

  const cumulativeGPA = useMemo(() => {
    const allCourses = semesters.flatMap(s => s.courses);
    return calculateGPA(allCourses);
  }, [semesters]);

  // --- Handlers ---

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
    e.stopPropagation();
    if (semesters.length === 1) return; // Don't delete last semester

    const newSemesters = semesters.filter(s => s.id !== id);
    setSemesters(newSemesters);
    if (activeSemId === id) {
      setActiveSemId(newSemesters[newSemesters.length - 1].id);
    }
  };

  const handleAddCourse = () => {
    const updatedSemesters = semesters.map(sem => {
      if (sem.id !== activeSemId) return sem;
      return {
        ...sem,
        courses: [...sem.courses, { id: crypto.randomUUID(), name: `Course ${sem.courses.length + 1}`, credits: 4, gradeIndex: 9 }]
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

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-neutral-200 font-sans flex flex-col">
      {/* Slider Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 16px; height: 16px; border-radius: 50%;
          background: #1a1a1a; border: 3px solid #E77500;
          cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.5);
          transition: transform 0.1s;
        }
        .custom-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
        .custom-slider::-moz-range-thumb {
          width: 16px; height: 16px; border-radius: 50%;
          background: #1a1a1a; border: 3px solid #E77500;
          cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.5);
          transition: transform 0.1s;
        }
        .custom-slider::-moz-range-thumb:hover { transform: scale(1.15); }

        /* Hide scrollbar for tabs */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* Sticky Top Header */}
      <div className="sticky top-0 z-50 bg-[#1a1a1a]/80 backdrop-blur-md border-b border-white/10 px-4 py-3 shadow-lg flex justify-between items-center">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-0.5">Cumulative</div>
          <div className="text-2xl font-black text-[#E77500] leading-none">{cumulativeGPA}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-0.5">Semester</div>
          <div className="text-2xl font-black text-white leading-none">{semesterGPA}</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-md mx-auto p-3 pb-20">
        <h2 className="text-sm font-bold text-neutral-400 mb-3 px-1">{activeSemester.name}</h2>

        <div className="space-y-2">
          {activeSemester.courses.map((course) => {
            const currentGrade = GRADES[course.gradeIndex];
            const percentage = (course.gradeIndex / (GRADES.length - 1)) * 100;

            return (
              <div key={course.id} className="bg-[#262626] rounded-xl p-3 border border-white/5 shadow-sm relative group">
                {/* Header Row: Title Input, Credits, and Current Grade */}
                <div className="flex justify-between items-center mb-3">
                  <input
                    type="text"
                    value={course.name}
                    onChange={(e) => handleUpdateCourse(course.id, 'name', e.target.value)}
                    className="bg-transparent text-sm font-bold text-white placeholder-neutral-500 outline-none w-1/2"
                    placeholder="Course Name"
                  />

                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-[#1a1a1a] rounded px-1.5 py-0.5 border border-white/5">
                      <span className="text-[10px] text-neutral-500 mr-1 uppercase">Hrs</span>
                      <select
                        value={course.credits}
                        onChange={(e) => handleUpdateCourse(course.id, 'credits', parseInt(e.target.value))}
                        className="bg-transparent text-xs text-neutral-300 outline-none cursor-pointer appearance-none text-center"
                      >
                        <option value={0}>0</option>
                        <option value={4}>4</option>
                        <option value={8}>8</option>
                      </select>
                    </div>

                    <div className="flex items-baseline w-12 justify-end">
                      <span className="text-lg font-extrabold text-white mr-1">{currentGrade.letter}</span>
                      <span className="text-[10px] text-neutral-400">{currentGrade.points.toFixed(1)}</span>
                    </div>

                    <button
                      onClick={() => handleRemoveCourse(course.id)}
                      className="text-neutral-500 hover:text-red-400 transition-colors ml-1 p-0.5 rounded-full hover:bg-white/10"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Compact Slider */}
                <div className="relative w-full">
                  <input
                    type="range"
                    min="0"
                    max={GRADES.length - 1}
                    step="1"
                    value={course.gradeIndex}
                    onChange={(e) => handleUpdateCourse(course.id, 'gradeIndex', parseInt(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer custom-slider outline-none"
                    style={{ background: `linear-gradient(to right, #E77500 ${percentage}%, #3f3f3f ${percentage}%)` }}
                  />
                  <div className="flex justify-between mt-1.5 text-[9px] font-bold text-neutral-500">
                    <span>F</span>
                    <span>A</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleAddCourse}
          className="w-full mt-3 py-2.5 rounded-xl border border-dashed border-neutral-600 text-neutral-400 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white/5 hover:border-neutral-500 transition-all"
        >
          <Plus size={14} /> Add Course
        </button>
      </div>

      {/* Fixed Bottom Tab Bar (Google Sheets style) */}
      <div className="fixed bottom-0 left-0 w-full bg-[#1a1a1a]/90 backdrop-blur-lg border-t border-white/10 h-12 flex items-center px-2 z-50">
        <div className="flex flex-1 overflow-x-auto no-scrollbar gap-1 items-center pr-4">
          {semesters.map((sem) => (
            <div
              key={sem.id}
              onClick={() => setActiveSemId(sem.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer whitespace-nowrap text-xs font-bold transition-all border ${
                activeSemId === sem.id
                  ? 'bg-[#262626] text-[#E77500] border-white/10 shadow-sm'
                  : 'bg-transparent text-neutral-500 border-transparent hover:bg-white/5'
              }`}
            >
              {sem.name}
              {semesters.length > 1 && activeSemId === sem.id && (
                <button
                  onClick={(e) => handleRemoveSemester(sem.id, e)}
                  className="hover:text-red-400 p-0.5 rounded-full transition-colors"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Semester Tab Button */}
        <div className="pl-2 border-l border-white/10 flex-shrink-0">
          <button
            onClick={handleAddSemester}
            className="w-8 h-8 flex items-center justify-center rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Add Semester"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
