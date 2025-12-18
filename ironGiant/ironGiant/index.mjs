import express from 'express';
import mysql from 'mysql2/promise';
import session from "express-session";

let app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: "iron-giant-secret",
  resave: false,
  saveUninitialized: false
}));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.isAdmin = Boolean(req.session.isAdmin);
  next();
});

let pool = mysql.createPool({
  host: "ysp9sse09kl0tzxj.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
  port: Number(process.env.DB_PORT || 3306),
  user: "egyljk8fk1nntjnt",
  password: "od00ub57ojuona94",
  database: "qzqguloj35scvg60",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  connectionLimit: 10,
  waitForConnections: true
});


app.get('/', async (req, res) => {
  let sqlExerciseCount = `SELECT COUNT(*) AS total FROM exercises;`;
  let sqlRoutineCount = `SELECT COUNT(*) AS total FROM routines;`;
  let sqlWorkoutCount = `SELECT COUNT(*) AS total FROM workouts;`;

  let [[exerciseCount]] = await pool.query(sqlExerciseCount);
  let [[routineCount]] = await pool.query(sqlRoutineCount);
  let [[workoutCount]] = await pool.query(sqlWorkoutCount);

  res.render("index", { exerciseCount, routineCount, workoutCount });
});

app.get('/exercises', async (req, res) => {
  let sqlExercises = `SELECT id, name, muscle_group, equipment, difficulty, description
                      FROM exercises
                      ORDER BY name;`;
  let [exercises] = await pool.query(sqlExercises);

  let sqlMuscles = `SELECT DISTINCT muscle_group FROM exercises ORDER BY muscle_group;`;
  let sqlEquipment = `SELECT DISTINCT equipment FROM exercises WHERE equipment IS NOT NULL AND equipment <> '' ORDER BY equipment;`;
  let sqlDifficulties = `SELECT DISTINCT difficulty FROM exercises ORDER BY difficulty;`;
  let [muscles] = await pool.query(sqlMuscles);
  let [equipment] = await pool.query(sqlEquipment);
  let [difficulties] = await pool.query(sqlDifficulties);

  let editExercise = null;
  if (req.query.editId) {
    let sqlEdit = `SELECT id, name, muscle_group, equipment, difficulty, description
                   FROM exercises
                   WHERE id = ?;`;
    let [rows] = await pool.query(sqlEdit, [req.query.editId]);

    if (rows.length) {
      editExercise = rows[0];
    }
  }

  res.render("exercises", { exercises, muscles, equipment, difficulties, editExercise });
});

app.post('/exercises/add', async (req, res) => {
  let name = req.body.name;
  let muscle_group = req.body.muscle_group;
  let equipment = req.body.equipment;
  let difficulty = req.body.difficulty;
  let description = req.body.description;

  if (!name || !muscle_group || !difficulty) {
    res.redirect("/exercises");
    return;
  }

  let sql = `INSERT INTO exercises (name, muscle_group, equipment, difficulty, description)
             VALUES (?, ?, ?, ?, ?);`;
  let params = [name, muscle_group, equipment || null, difficulty, description || null];
  await pool.query(sql, params);

  res.redirect("/exercises");
});

app.post('/exercises/update', async (req, res) => {
  let id = req.body.id;
  let name = req.body.name;
  let muscle_group = req.body.muscle_group;
  let equipment = req.body.equipment;
  let difficulty = req.body.difficulty;
  let description = req.body.description;

  let sql = `UPDATE exercises
             SET name = ?,
                 muscle_group = ?,
                 equipment = ?,
                 difficulty = ?,
                 description = ?
             WHERE id = ?;`;
  let params = [name, muscle_group, equipment || null, difficulty, description || null, id];
  await pool.query(sql, params);

  res.redirect("/exercises");
});

app.get('/exercises/delete', async (req, res) => {
  let id = req.query.id;
  let sql = `DELETE FROM exercises WHERE id = ?;`;
  await pool.query(sql, [id]);

  res.redirect("/exercises");
});


app.get('/routines', async (req, res) => {
  let sqlRoutines = `SELECT id, name FROM routines WHERE user_id = 1 ORDER BY name;`;
  let [routines] = await pool.query(sqlRoutines);

  let sqlExercises = `SELECT id, name FROM exercises ORDER BY name;`;
  let [exercises] = await pool.query(sqlExercises);

  let routine = null;
  let routineExercises = [];
  if (req.query.routineId) {
    let sqlRoutine = `SELECT id, name FROM routines WHERE id = ? AND user_id = 1;`;
    let [r] = await pool.query(sqlRoutine, [req.query.routineId]);
    if (r.length) {
      routine = r[0];
    }

    let sqlRoutineExercises = `SELECT re.id, re.routine_id, re.exercise_id, e.name AS exercise_name,
                                      re.default_sets, re.default_reps, re.sort_order
                               FROM routine_exercises re
                               JOIN exercises e ON e.id = re.exercise_id
                               WHERE re.routine_id = ?
                               ORDER BY re.sort_order, re.id;`;
    let [reRows] = await pool.query(sqlRoutineExercises, [req.query.routineId]);
    routineExercises = reRows;
  }

  res.render("routines", { routines, exercises, routine, routineExercises });
});

app.post('/routines/add', async (req, res) => {
  let name = req.body.name;

  if (!name) {
    res.redirect("/routines");
    return;
  }

  let sql = `INSERT INTO routines (user_id, name) VALUES (1, ?);`;
  await pool.query(sql, [name]);

  res.redirect("/routines");
});

app.post('/routines/addExercise', async (req, res) => {
  let routine_id = req.body.routine_id;
  let exercise_id = req.body.exercise_id;
  let default_sets = req.body.default_sets;
  let default_reps = req.body.default_reps;
  let sort_order = req.body.sort_order;

  let sql = `INSERT INTO routine_exercises (routine_id, exercise_id, default_sets, default_reps, sort_order)
             VALUES (?, ?, ?, ?, ?);`;
  let params = [
    routine_id,
    exercise_id,
    default_sets || null,
    default_reps || null,
    sort_order || null
  ];
  await pool.query(sql, params);

  res.redirect(`/routines?routineId=${routine_id}`);
});

app.get('/routines/deleteExercise', async (req, res) => {
  let id = req.query.id;
  let routineId = req.query.routineId;

  let sql = `DELETE FROM routine_exercises WHERE id = ?;`;
  await pool.query(sql, [id]);

  res.redirect(`/routines?routineId=${routineId}`);
});

app.get('/routines/delete', async (req, res) => {
  let id = req.query.id;

  await pool.query(`DELETE FROM routine_exercises WHERE routine_id = ?;`, [id]);
  await pool.query(`DELETE FROM routines WHERE id = ? AND user_id = 1;`, [id]);

  res.redirect("/routines");
});


app.get('/history', async (req, res) => {
  let sqlRoutines = `SELECT id, name FROM routines WHERE user_id = 1 ORDER BY name;`;
  let [routines] = await pool.query(sqlRoutines);

  let sqlHistory = `SELECT w.id, w.workout_date, w.notes, r.name AS routine_name
                    FROM workouts w
                    LEFT JOIN routines r ON r.id = w.routine_id
                    WHERE w.user_id = 1
                    ORDER BY w.workout_date DESC, w.id DESC;`;
  let [workouts] = await pool.query(sqlHistory);

  res.render("history", { routines, workouts });
});

app.post('/history/add', async (req, res) => {
  let routine_id = req.body.routine_id;
  let workout_date = req.body.workout_date;
  let notes = req.body.notes;

  if (!workout_date) {
    res.redirect("/history");
    return;
  }

  let sql = `INSERT INTO workouts (user_id, routine_id, workout_date, notes)
             VALUES (1, ?, ?, ?);`;
  await pool.query(sql, [routine_id || null, workout_date, notes || null]);

  res.redirect("/history");
});

app.get('/history/delete', async (req, res) => {
  let id = req.query.id;

  let sql = `DELETE FROM workouts WHERE id = ? AND user_id = 1;`;
  await pool.query(sql, [id]);

  res.redirect("/history");
});

app.post('/routines/updateExercise', async (req, res) => {
  let routine_exercise_id = req.body.routine_exercise_id;
  let routine_id = req.body.routine_id;
  let default_sets = req.body.default_sets;
  let default_reps = req.body.default_reps;
  let sort_order = req.body.sort_order;

  let sets = default_sets === "" ? null : Number(default_sets);
  let reps = default_reps === "" ? null : Number(default_reps);
  let order = sort_order === "" ? null : Number(sort_order);

  await pool.query(
    `UPDATE routine_exercises re
      JOIN routines r ON r.id = re.routine_id
      SET re.default_sets = ?, re.default_reps = ?, re.sort_order = ?
      WHERE re.id = ? AND r.user_id = 1`,
    [sets, reps, order, routine_exercise_id]
  );

  res.redirect("/routines?routineId=" + routine_id);
});

app.get('/register', async (req, res) => {
  res.render("register", { error: null });
});

app.post('/register', async (req, res) => {
  let name = req.body.name;
  let email = req.body.email;
  let password = req.body.password;
  let confirm = req.body.confirm;

  if (password != confirm) {
    res.render("register", { error: "passwords do not match" });
    return;
  }

  let sql = `INSERT INTO users (name, email, password) VALUES (?, ?, ?);`;
  await pool.query(sql, [name, email, password]);

  res.redirect("/login");
});


app.get('/login', async (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const sql = `SELECT id, name, email FROM users WHERE email = ? AND password = ? LIMIT 1;`;
  const [rows] = await pool.query(sql, [email, password]);

  if (rows.length) {
    const user = rows[0];

    // store logged-in user in session
    req.session.user = { id: user.id, name: user.name, email: user.email };

    // define admin however you want (simple option: specific email)
    req.session.isAdmin = (user.email === "admin@iron.com");

    return res.redirect("/");
  }

  res.render("login", { error: "invalid login" });
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

let PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`server started on ${PORT}`);
});
