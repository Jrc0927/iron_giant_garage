document.addEventListener("DOMContentLoaded", () => {
  loadQuote();
  loadTip();

  setupAdmin();
  setupWorkoutRemember();

  setupExerciseForms();
  setupRoutineForm();
  setupWorkoutForm();

  setupExerciseFilters();
});

async function loadQuote() {
  const el = document.querySelector("#quote");
  if (!el) return;

  try {
    const res = await fetch("https://dummyjson.com/quotes/random");
    if (!res.ok) throw new Error("Quote API error");

    const data = await res.json();
    el.textContent = `"${data.quote}" — ${data.author}`;
  } catch (err) {
    console.error("Quote API failed:", err);
    el.textContent = "Stay consistent. Results will follow.";
  }
}

async function loadTip() {
  let el = document.querySelector("#tip");
  if (!el) return;

  let url = "https://api.adviceslip.com/advice";
  let res = await fetch(url);
  let data = await res.json();

  el.textContent = `Tip: ${data.slip.advice}`;
}

function setupAdmin() {
  const loggedInMeta = document.querySelector('meta[name="logged-in"]');
  const isAdminUserMeta = document.querySelector('meta[name="is-admin-user"]');

  const loggedIn = loggedInMeta && loggedInMeta.content === "yes";
  const isAdminUser = isAdminUserMeta && isAdminUserMeta.content === "yes";

  // If a real (non-admin) user is logged in, disable guest-admin mode
  if (loggedIn && !isAdminUser) {
    localStorage.removeItem("isAdmin");
    return; 
  }

  let form = document.querySelector("#adminForm");
  let area = document.querySelector("#adminArea");
  let msg = document.querySelector("#adminMsg");
  let logoutBtn = document.querySelector("#logoutBtn");

  if (area && localStorage.getItem("isAdmin") === "yes") {
    area.style.display = "block";
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      let user = form.user.value.trim();
      let pass = form.pass.value.trim();

      if (user === "admin" && pass === "secret") {
        localStorage.setItem("isAdmin", "yes");
        if (msg) msg.textContent = " logged in";
        if (area) area.style.display = "block";
        form.reset();
        return;
      }

      localStorage.removeItem("isAdmin");
      if (msg) msg.textContent = " wrong login";
      if (area) area.style.display = "none";
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("isAdmin");
      if (area) area.style.display = "none";
      if (msg) msg.textContent = "";
    });
  }
}

function setupExerciseForms() {
  let addForm = document.querySelector("#addExerciseForm");
  let addMsg = document.querySelector("#addMsg");
  if (addForm) {
    addForm.addEventListener("submit", (e) => {
      let name = addForm.name.value.trim();
      let muscle = addForm.muscle_group.value.trim();
      let diff = addForm.querySelector("input[name='difficulty']:checked");

      if (!name || !muscle || !diff) {
        e.preventDefault();
        if (addMsg) addMsg.textContent = " enter name, muscle, difficulty";
      }
    });
  }

  let editForm = document.querySelector("#editExerciseForm");
  let editMsg = document.querySelector("#editMsg");
  if (editForm) {
    editForm.addEventListener("submit", (e) => {
      let name = editForm.name.value.trim();
      let muscle = editForm.muscle_group.value.trim();
      let diff = editForm.querySelector("input[name='difficulty']:checked");

      if (!name || !muscle || !diff) {
        e.preventDefault();
        if (editMsg) editMsg.textContent = " required fields missing";
      }
    });
  }
}

function setupRoutineForm() {
  let f = document.querySelector("#addRoutineForm");
  let m = document.querySelector("#routineMsg");
  if (!f) return;

  f.addEventListener("submit", (e) => {
    let name = f.name.value.trim();
    if (!name) {
      e.preventDefault();
      if (m) m.textContent = " enter a routine name";
    }
  });
}

function setupWorkoutRemember() {
  let routineSelect = document.querySelector("#routine_id");
  if (!routineSelect) return;

  let last = localStorage.getItem("lastRoutineId");
  if (last) routineSelect.value = last;
}

function setupWorkoutForm() {
  let f = document.querySelector("#addWorkoutForm");
  let m = document.querySelector("#workoutMsg");
  let routineSelect = document.querySelector("#routine_id");
  let remember = document.querySelector("#rememberRoutine");

  if (!f) return;

  f.addEventListener("submit", (e) => {
    let date = document.querySelector("#workout_date").value;
    if (!date) {
      e.preventDefault();
      if (m) m.textContent = " pick a date";
      return;
    }

    if (remember && remember.checked && routineSelect) {
      localStorage.setItem("lastRoutineId", routineSelect.value);
    }
  });
}

function setupExerciseFilters() {
  let list = document.querySelector("#exerciseList");
  if (!list) return;

  let muscle = document.querySelector("#muscle");
  let equipment = document.querySelector("#equipment");
  let noEquip = document.querySelector("#noEquip");

  function getItemMuscle(item) {
    let spans = item.querySelectorAll(".meta span");
    return spans.length ? spans[0].textContent : "";
  }

  function getItemEquipment(item) {
    let spans = item.querySelectorAll(".meta span");
    return spans.length > 1 ? spans[1].textContent : "";
  }

  function apply() {
    let m = muscle ? muscle.value : "";
    let e = equipment ? equipment.value : "";
    let onlyNoEquip = noEquip && noEquip.checked;

    for (let item of list.querySelectorAll("li")) {
      let itemMuscle = getItemMuscle(item);
      let itemEquip = getItemEquipment(item);

      let ok = true;
      if (m && itemMuscle !== m) ok = false;
      if (e && itemEquip !== e) ok = false;
      if (onlyNoEquip && itemEquip !== "None") ok = false;

      item.style.display = ok ? "" : "none";
    }
  }

  if (muscle) muscle.addEventListener("change", apply);
  if (equipment) equipment.addEventListener("change", apply);
  if (noEquip) noEquip.addEventListener("change", apply);
}
