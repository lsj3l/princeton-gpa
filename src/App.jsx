import { useState, useMemo, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  ArrowUpRight,
  ShieldCheck,
  GraduationCap,
  Undo2,
  X,
  BookOpen,
} from "lucide-react";

// Princeton Grading Scale mapping up to A (4.0)
const GRADES = [
  { letter: "F", points: 0.0 },
  { letter: "D", points: 1.0 },
  { letter: "C-", points: 1.7 },
  { letter: "C", points: 2.0 },
  { letter: "C+", points: 2.3 },
  { letter: "B-", points: 2.7 },
  { letter: "B", points: 3.0 },
  { letter: "B+", points: 3.3 },
  { letter: "A-", points: 3.7 },
  { letter: "A", points: 4.0 },
];

const SEMESTER_NAMES = [
  "Freshman Fall",
  "Freshman Spring",
  "Sophomore Fall",
  "Sophomore Spring",
  "Junior Fall",
  "Junior Spring",
  "Senior Fall",
  "Senior Spring",
];

const generateInitialCourses = () => {
  return Array(4)
    .fill(null)
    .map((_, i) => ({
      id: crypto.randomUUID(),
      name: `Course ${i + 1}`,
      credits: 4,
      gradeIndex: 9, // Default to 'A'
    }));
};

const STORAGE_KEY = "princeton-gpa:v1";

const loadCalculator = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const valid =
      saved &&
      Array.isArray(saved.semesters) &&
      saved.semesters.length > 0 &&
      saved.semesters.every(
        (semester) =>
          semester &&
          typeof semester.id === "string" &&
          typeof semester.name === "string" &&
          Array.isArray(semester.courses) &&
          semester.courses.every(
            (course) =>
              course &&
              typeof course.id === "string" &&
              typeof course.name === "string" &&
              [0, 4, 8].includes(course.credits) &&
              Number.isInteger(course.gradeIndex) &&
              course.gradeIndex >= 0 &&
              course.gradeIndex < GRADES.length,
          ),
      );

    if (valid) {
      return {
        semesters: saved.semesters,
        activeSemId: saved.semesters.some(
          (semester) => semester.id === saved.activeSemId,
        )
          ? saved.activeSemId
          : saved.semesters[0].id,
      };
    }
  } catch {
    // Unavailable storage or invalid saved data should not prevent using the calculator.
  }

  const semesters = [
    {
      id: crypto.randomUUID(),
      name: SEMESTER_NAMES[0],
      courses: generateInitialCourses(),
    },
  ];
  return { semesters, activeSemId: semesters[0].id };
};

const totals = (courses) => {
  const hours = courses.reduce((sum, course) => sum + course.credits, 0);
  const points = courses.reduce(
    (sum, course) => sum + course.credits * GRADES[course.gradeIndex].points,
    0,
  );
  return {
    hours,
    gpa: hours ? (points / hours).toFixed(2) : "—",
    count: courses.filter((course) => course.credits > 0).length,
  };
};

export default function App() {
  const [initialCalculator] = useState(loadCalculator);
  const [semesters, setSemesters] = useState(initialCalculator.semesters);
  const [activeSemId, setActiveSemId] = useState(initialCalculator.activeSemId);
  const [undo, setUndo] = useState(null);
  const focusTargetRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ semesters, activeSemId }),
      );
    } catch {
      /* The calculator still works when storage is unavailable. */
    }
  }, [semesters, activeSemId]);

  const activeSemester =
    semesters.find((semester) => semester.id === activeSemId) || semesters[0];
  const semesterTotal = useMemo(
    () => totals(activeSemester.courses),
    [activeSemester],
  );
  const cumulative = useMemo(
    () => totals(semesters.flatMap((semester) => semester.courses)),
    [semesters],
  );
  const gradeGroups = ["A", "B", "C", "D", "F"].map((letter) => ({
    letter,
    count: activeSemester.courses.filter(
      (course) =>
        course.credits > 0 &&
        GRADES[course.gradeIndex].letter.startsWith(letter),
    ).length,
  }));

  const updateCourse = (courseId, field, value) =>
    setSemesters((previous) =>
      previous.map((semester) =>
        semester.id !== activeSemId
          ? semester
          : {
              ...semester,
              courses: semester.courses.map((course) =>
                course.id === courseId ? { ...course, [field]: value } : course,
              ),
            },
      ),
    );

  const addCourse = () => {
    const id = crypto.randomUUID();
    setSemesters((previous) =>
      previous.map((semester) =>
        semester.id !== activeSemId
          ? semester
          : {
              ...semester,
              courses: [
                ...semester.courses,
                {
                  id,
                  name: `Course ${semester.courses.length + 1}`,
                  credits: 4,
                  gradeIndex: 9,
                },
              ],
            },
      ),
    );
    focusTargetRef.current = `course-${id}`;
  };

  useEffect(() => {
    if (focusTargetRef.current) {
      document.getElementById(focusTargetRef.current)?.focus();
      focusTargetRef.current = null;
    }
  }, [semesters, activeSemId]);

  const removeCourse = (course) => {
    const remaining = activeSemester.courses.filter(
      (item) => item.id !== course.id,
    );
    const next =
      remaining[
        Math.min(activeSemester.courses.indexOf(course), remaining.length - 1)
      ];
    focusTargetRef.current = next ? `course-${next.id}` : "add-course";
    setUndo({
      type: "course",
      semesterId: activeSemId,
      course,
      index: activeSemester.courses.findIndex((item) => item.id === course.id),
      message: `${course.name || "Course"} removed`,
    });
    setSemesters((previous) =>
      previous.map((semester) =>
        semester.id !== activeSemId
          ? semester
          : {
              ...semester,
              courses: semester.courses.filter((item) => item.id !== course.id),
            },
      ),
    );
  };

  const addSemester = () => {
    const id = crypto.randomUUID();
    setSemesters((previous) => [
      ...previous,
      {
        id,
        name:
          SEMESTER_NAMES[previous.length] || `Semester ${previous.length + 1}`,
        courses: generateInitialCourses(),
      },
    ]);
    focusTargetRef.current = "semester-name";
    setActiveSemId(id);
  };

  const removeSemester = (semester) => {
    if (semesters.length === 1) return;
    setUndo({
      type: "semester",
      semester,
      index: semesters.findIndex((item) => item.id === semester.id),
      message: `${semester.name || "Semester"} removed`,
    });
    const remaining = semesters.filter((item) => item.id !== semester.id);
    focusTargetRef.current = "semester-name";
    setSemesters(remaining);
    if (activeSemId === semester.id)
      setActiveSemId(remaining[remaining.length - 1].id);
  };

  const restore = () => {
    if (undo.type === "semester") {
      setSemesters((previous) => {
        if (previous.some((semester) => semester.id === undo.semester.id))
          return previous;
        const restored = [...previous];
        restored.splice(undo.index, 0, undo.semester);
        return restored;
      });
      focusTargetRef.current = "semester-name";
      setActiveSemId(undo.semester.id);
    } else {
      setSemesters((previous) =>
        previous.map((semester) => {
          if (
            semester.id !== undo.semesterId ||
            semester.courses.some((course) => course.id === undo.course.id)
          )
            return semester;
          const courses = [...semester.courses];
          courses.splice(undo.index, 0, undo.course);
          return { ...semester, courses };
        }),
      );
      focusTargetRef.current = `course-${undo.course.id}`;
      setActiveSemId(undo.semesterId);
    }
    setUndo(null);
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#calculator">
        Skip to calculator
      </a>
      <header className="site-header">
        <a
          href="#"
          className="wordmark"
          aria-label="Princeton GPA planner home"
        >
          <span className="brand-icon">
            <GraduationCap size={24} strokeWidth={1.6} />
          </span>
          <span>
            Princeton<span className="wordmark-sub">GPA PLANNER</span>
          </span>
        </a>
        <div className="header-actions">
          <a
            href="#how-it-works"
            onClick={() => {
              document.getElementById("how-it-works").open = true;
            }}
          >
            How it works <ArrowUpRight size={14} />
          </a>
          <span className="privacy-label">
            <ShieldCheck size={15} /> <span>Private to your browser</span>
          </span>
        </div>
      </header>

      <main className="page-wrap" id="calculator">
        <section className="intro">
          <div className="eyebrow">
            <span /> A LITTLE PLANNING GOES A LONG WAY
          </div>
          <h1>
            Your grades. <em>A clearer picture.</em>
          </h1>
          <p>Plan a semester, explore a what-if, and see how it all adds up.</p>
        </section>

        <div className="workspace">
          <section className="planner" aria-label="Course planner">
            <div className="semester-heading">
              <span className="section-label">YOUR SEMESTERS</span>
              <button className="text-button" onClick={addSemester}>
                <Plus size={15} /> Add semester
              </button>
            </div>
            <nav className="semester-list" aria-label="Semesters">
              {semesters.map((semester, index) => (
                <div
                  className={`semester-tab ${semester.id === activeSemId ? "active" : ""}`}
                  key={semester.id}
                >
                  <button
                    className="semester-switch"
                    aria-pressed={semester.id === activeSemId}
                    onClick={() => setActiveSemId(semester.id)}
                  >
                    <span className="tab-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {semester.name || "Untitled semester"}
                  </button>
                  {semester.id === activeSemId && semesters.length > 1 && (
                    <button
                      className="tab-remove"
                      aria-label={`Remove ${semester.name || "semester"}`}
                      onClick={() => removeSemester(semester)}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </nav>

            <div className="course-section-heading">
              <div>
                <label className="sr-only" htmlFor="semester-name">
                  Semester name
                </label>
                <input
                  id="semester-name"
                  className="semester-name"
                  value={activeSemester.name}
                  maxLength={60}
                  placeholder="Name this semester"
                  onChange={(event) =>
                    setSemesters((previous) =>
                      previous.map((semester) =>
                        semester.id === activeSemId
                          ? { ...semester, name: event.target.value }
                          : semester,
                      ),
                    )
                  }
                />
                <p>
                  {activeSemester.courses.length}{" "}
                  {activeSemester.courses.length === 1 ? "course" : "courses"}{" "}
                  <span>·</span> Every grade is a possibility.
                </p>
              </div>
              <button
                id="add-course"
                className="primary-button"
                onClick={addCourse}
              >
                <Plus size={16} /> Add course
              </button>
            </div>

            <div className="course-list">
              {activeSemester.courses.map((course, index) => {
                const grade = GRADES[course.gradeIndex];
                return (
                  <article
                    className={`course-card ${course.credits === 0 ? "excluded" : ""}`}
                    key={course.id}
                    aria-label={`Course ${index + 1}`}
                  >
                    <div className="course-top">
                      <span className="course-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="course-name-group">
                        <label htmlFor={`course-${course.id}`}>
                          COURSE NAME
                        </label>
                        <input
                          id={`course-${course.id}`}
                          value={course.name}
                          placeholder="e.g. COS 126"
                          maxLength={100}
                          onChange={(event) =>
                            updateCourse(course.id, "name", event.target.value)
                          }
                        />
                      </div>
                      <div className="hours-group">
                        <label htmlFor={`hours-${course.id}`}>
                          SEMESTER HOURS
                        </label>
                        <select
                          id={`hours-${course.id}`}
                          aria-label={`Semester hours for ${course.name || `course ${index + 1}`}`}
                          value={course.credits}
                          onChange={(event) =>
                            updateCourse(
                              course.id,
                              "credits",
                              Number(event.target.value),
                            )
                          }
                        >
                          <option value={4}>4 · Regular</option>
                          <option value={8}>8 · Double-weight</option>
                          <option value={0}>0 · Excluded</option>
                        </select>
                      </div>
                      <div className="grade-group">
                        <label
                          className="sr-only"
                          htmlFor={`grade-${course.id}`}
                        >
                          Grade for {course.name || `course ${index + 1}`}
                        </label>
                        <select
                          id={`grade-${course.id}`}
                          value={course.gradeIndex}
                          onChange={(event) =>
                            updateCourse(
                              course.id,
                              "gradeIndex",
                              Number(event.target.value),
                            )
                          }
                        >
                          {GRADES.map((item, gradeIndex) => (
                            <option value={gradeIndex} key={item.letter}>
                              {item.letter}
                            </option>
                          ))}
                        </select>
                        <span>{grade.points.toFixed(1)} pts</span>
                      </div>
                      <button
                        className="icon-button remove-course"
                        aria-label={`Remove ${course.name || `course ${index + 1}`}`}
                        onClick={() => removeCourse(course)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grade-slider">
                      <input
                        aria-label={`Adjust grade for ${course.name || `course ${index + 1}`}`}
                        aria-valuetext={`${grade.letter}, ${grade.points.toFixed(1)} grade points`}
                        type="range"
                        min="0"
                        max={GRADES.length - 1}
                        step="1"
                        value={course.gradeIndex}
                        onChange={(event) =>
                          updateCourse(
                            course.id,
                            "gradeIndex",
                            Number(event.target.value),
                          )
                        }
                        style={{
                          "--fill": `${(course.gradeIndex / (GRADES.length - 1)) * 100}%`,
                        }}
                      />
                      <div className="grade-scale" aria-hidden="true">
                        {GRADES.map((item) => (
                          <span
                            className={
                              item.letter === grade.letter ? "selected" : ""
                            }
                            key={item.letter}
                          >
                            {item.letter}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
              {activeSemester.courses.length === 0 && (
                <div className="empty-state">
                  <BookOpen size={32} strokeWidth={1.3} />
                  <h3>A fresh page.</h3>
                  <p>Add your first course to start planning this semester.</p>
                  <button className="primary-button" onClick={addCourse}>
                    <Plus size={16} /> Add your first course
                  </button>
                </div>
              )}
            </div>
            {activeSemester.courses.length > 0 && (
              <button className="add-course-bottom" onClick={addCourse}>
                <Plus size={16} /> Add another course
              </button>
            )}
            <p className="planner-note">
              <ShieldCheck size={14} /> Your plan stays in this browser. No
              account or uploads needed.
            </p>
          </section>

          <aside className="summary" aria-label="GPA summary">
            <div className="cumulative-card">
              <div className="summary-eyebrow">
                THE BIG PICTURE <span>4.0 SCALE</span>
              </div>
              <h2>Estimated cumulative GPA</h2>
              <div className="gpa-value" data-testid="cumulative-gpa">
                {cumulative.gpa}
              </div>
              <p className="gpa-context">
                Across {semesters.length}{" "}
                {semesters.length === 1 ? "semester" : "semesters"}. All coming
                together.
              </p>
              <div className="gpa-meter" aria-hidden="true">
                <span
                  style={{
                    width: `${cumulative.hours ? (Number(cumulative.gpa) / 4) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="summary-stats">
                <div>
                  <strong>{cumulative.count}</strong>
                  <span>graded courses</span>
                </div>
                <div>
                  <strong>{cumulative.hours}</strong>
                  <span>semester hours</span>
                </div>
              </div>
              <span className="card-decoration" aria-hidden="true">
                ✳
              </span>
            </div>
            <div className="semester-summary">
              <div className="section-label">THIS SEMESTER</div>
              <div className="semester-score">
                <strong data-testid="semester-gpa">{semesterTotal.gpa}</strong>
                <span>estimated GPA</span>
              </div>
              <div className="distribution" aria-label="Grade distribution">
                {gradeGroups.map((group) => (
                  <div className="distribution-column" key={group.letter}>
                    <div className="bar-track">
                      <span
                        style={{
                          height: `${semesterTotal.count ? (group.count / semesterTotal.count) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span>{group.letter}</span>
                    <span className="sr-only">{group.count} courses</span>
                  </div>
                ))}
              </div>
            </div>
            <details className="how-card" id="how-it-works">
              <summary>
                A note on the numbers <Plus size={16} />
              </summary>
              <div className="how-content">
                <p>
                  Each grade is weighted by its semester hours. Regular courses
                  use 4; double-weight courses use 8.
                </p>
                <p>
                  Use A for A+ (both are 4.0). For P, AUD, Inc, or W, select 0
                  hours to exclude the course.
                </p>
                <p>
                  New courses start at A so you can explore a scenario. This is
                  an estimate, not an official record.
                </p>
                <a
                  href="https://registrar.princeton.edu/student-and-alumni-services/transcript-and-verification-services/calculate-your-gpa"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the Registrar’s guide <ArrowUpRight size={13} />
                </a>
              </div>
            </details>
          </aside>
        </div>
        <div className="sr-only" role="status" aria-live="polite">
          Estimated cumulative GPA: {cumulative.gpa}. Estimated semester GPA:{" "}
          {semesterTotal.gpa}.
        </div>
      </main>
      <footer className="site-footer">
        <span>
          Made with care by{" "}
          <a
            href="https://github.com/lsj3l/princeton-gpa"
            target="_blank"
            rel="noreferrer"
          >
            John Saleh <ArrowUpRight size={12} />
          </a>
        </span>
        <p>
          An independent planning tool. Not affiliated with Princeton
          University.
        </p>
      </footer>
      {undo && (
        <div className="undo-toast" role="status">
          <span>{undo.message}</span>
          <button onClick={restore}>
            <Undo2 size={15} /> Undo
          </button>
          <button
            className="toast-dismiss"
            aria-label="Dismiss notification"
            onClick={() => setUndo(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
