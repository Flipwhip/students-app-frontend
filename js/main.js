const SERVER_URL = "https://student-api-backend-bv0d.onrender.com";

// функции для работы с сервером
// Получение студентов с сервера с применением фильтров (если есть)
async function serverGetStudents(filters = {}) {
  try {
    // Создаем строку запроса
    const searchParams = new URLSearchParams(filters);

    let response = await fetch(
      `${SERVER_URL}/api/students?${searchParams.toString()}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    let data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error("Ошибка при получении студентов:", error);
    return [];
  }
}

// добавление студента на сервер
async function serverAddStudent(obj) {
  try {
    let response = await fetch(`${SERVER_URL}/api/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obj),
    });

    let data = await response.json();

    // Проверяем статус ответа
    if (!response.ok) {
      // Если сервер вернул ошибку (400, 422 и т.д.)
      console.error("Ошибка от сервера:", data);
      alert(data.message || "Ошибка при добавлении студента!");
      return null;
    }

    return data;
  } catch (error) {
    console.error("Ошибка при добавлении студента:", error);
    alert("Ошибка сети при добавлении студента!");
    return null;
  }
}

// удаление студента из сервера
async function serverDeleteStudent(id) {
  try {
    let response = await fetch(`${SERVER_URL}/api/students/${id}`, {
      method: "DELETE",
    });

    let data = await response.json();
    return data;
  } catch (error) {
    console.error("Ошибка при удалении студента:", error);
    return null;
  }
}

// Функция debounce для задержки запросов
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Добавляем новую функцию для обновления данных студента на сервере
async function serverUpdateStudent(id, obj) {
  try {
    let response = await fetch(`${SERVER_URL}/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obj),
    });

    let data = await response.json();
    return data;
  } catch (error) {
    console.error("Ошибка при обновлении студента:", error);
    return null;
  }
}

// Глобальная переменная для отслеживания режима редактирования
let isEditMode = false;
let editingStudentId = null;

class Student {
  constructor(
    name,
    surname,
    lastname,
    studyStart,
    birthday,
    faculty,
    id = null
  ) {
    this.surname = surname;
    this.name = name;
    this.lastname = lastname;
    this.studyStart = studyStart;
    this.birthday = birthday;
    this.faculty = faculty;
    this.id = id;
  }

  get fio() {
    return `${this.surname} ${this.name} ${this.lastname}`;
  }

  getBirthdayString() {
    return this.birthday.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  getAge() {
    const birthday = this.birthday;
    const today = new Date();

    let age = today.getFullYear() - birthday.getFullYear();
    const monthDif = today.getMonth() - birthday.getMonth();

    if (
      monthDif < 0 ||
      (monthDif === 0 && today.getDate() < birthday.getDate())
    ) {
      age--;
    }

    return this.getCorrectDeclension(age);
  }

  getStudyPeriod() {
    const currentDate = new Date();
    const startYear = Number(this.studyStart);
    const endYear = startYear + 4;
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    let courseStatus;

    if (
      currentYear < startYear ||
      (currentYear === startYear && currentMonth < 8)
    ) {
      courseStatus = "еще не начал учебу";
    } else if (
      currentYear > endYear ||
      (currentYear === endYear && currentMonth >= 8)
    ) {
      courseStatus = "закончил";
    } else {
      let yearsStudied = currentYear - startYear;

      if (currentMonth >= 8) {
        yearsStudied += 1;
      }

      courseStatus = `${yearsStudied} курс`;
    }

    return `${startYear} - ${endYear} (${courseStatus})`;
  }

  getCorrectDeclension(age) {
    const lastDigit = age % 10;
    const lastTwoDigits = age % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
      return `${age} лет`;
    }

    if (lastDigit === 1) {
      return `${age} год`;
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
      return `${age} года`;
    }

    return `${age} лет`;
  }
}

let studentsList = [];

// Функция загрузки и обновления списка студентов
async function fetchAndRenderStudents() {
  try {
    // Создаем параметр search для серверного поиска
    const serverFilters = {};
    if ($searchStudentInp.value.trim()) {
      serverFilters.search = $searchStudentInp.value.trim();
    }

    // Запрашиваем данные с сервера с параметром search
    let serverData = await serverGetStudents(serverFilters);

    if (serverData && Array.isArray(serverData)) {
      // Преобразуем данные в экземпляры класса Student
      let studentsArray = serverData.map(
        (student) =>
          new Student(
            student.name,
            student.surname,
            student.lastname,
            student.studyStart,
            new Date(student.birthday),
            student.faculty,
            student.id
          )
      );

      // Применяем клиентскую фильтрацию к полученным данным
      let filteredStudents = [...studentsArray];

      // Фильтрация по ФИО на клиенте
      if ($filterFioInp.value.trim()) {
        filteredStudents = getFilterStudents(
          filteredStudents,
          "fio",
          $filterFioInp.value
        );
        if (!manualSortApplied) {
          column = "fio";
          columnDir = true;
        }
      }

      // Фильтрация по факультету на клиенте
      if ($filterFacultyInp.value.trim()) {
        filteredStudents = getFilterStudents(
          filteredStudents,
          "faculty",
          $filterFacultyInp.value
        );
        if (!manualSortApplied) {
          column = "faculty";
          columnDir = true;
        }
      }

      // Фильтрация по году начала обучения на клиенте
      if ($filterStudyStartInp.value.trim().length === 4) {
        filteredStudents = getFilterStudents(
          filteredStudents,
          "studyStart",
          $filterStudyStartInp.value
        );
        if (!manualSortApplied) {
          column = "studyStart";
          columnDir = true;
        }
      }

      // Фильтрация по году окончания на клиенте
      if ($filterStudyEndInp.value.trim().length === 4) {
        filteredStudents = filteredStudents.filter(
          (student) =>
            Number($filterStudyEndInp.value) === Number(student.studyStart) + 4
        );
        if (!manualSortApplied) {
          column = "studyStart";
          columnDir = true;
        }
      }

      // Обновляем список студентов
      studentsList = filteredStudents;

      // Проверяем, пусты ли все фильтры
      const allFiltersEmpty = [
        $filterFioInp.value,
        $filterFacultyInp.value,
        $filterStudyStartInp.value,
        $filterStudyEndInp.value,
        $searchStudentInp.value,
      ].every((value) => value.trim() === "");

      if (allFiltersEmpty) {
        manualSortApplied = false;
      }

      // Применяем сортировку и рендеринг
      applySortAndRender();
    } else {
      console.log("Не удалось загрузить данные студентов или данных нет");
      studentsList = [];
      applySortAndRender();
    }
  } catch (error) {
    console.error("Ошибка при загрузке студентов:", error);
    studentsList = [];
    applySortAndRender();
  }
}

// Создаем debounced-версию fetchAndRenderStudents
const debouncedFetchAndRender = debounce(fetchAndRenderStudents, 400);

// При загрузке страницы загружаем студентов
document.addEventListener("DOMContentLoaded", () => {
  debouncedFetchAndRender();
});

const $form = document.getElementById("add-student"),
  validateBtn = document.getElementById("validateBtn"),
  inputFields = document.querySelectorAll('[data-validate="true"]');

// Функция для удаления сообщения об ошибке
function removeError(input) {
  const parent = input.parentNode;

  const errorElements = parent.querySelectorAll(".invalid-feedback");
  errorElements.forEach((el) => el.remove());
  parent.classList.remove("error");
  input.classList.remove("is-invalid");
  input.classList.add("is-valid");
}

function clearValidationState(input) {
  // Убираем классы успешной и неуспешной валидации
  input.classList.remove("is-valid");
  input.classList.remove("is-invalid");

  // Удаляем предыдущие сообщения об ошибках
  const parent = input.parentNode;
  const errorElements = parent.querySelectorAll(".invalid-feedback");
  errorElements.forEach((el) => el.remove());
  parent.classList.remove("error");
}

// Функция для создания сообщения об ошибке
function createError(input, text) {
  const parent = input.parentNode;

  // Сначала удаляем существующие сообщения об ошибках
  const existingErrors = parent.querySelectorAll(".invalid-feedback");
  existingErrors.forEach((el) => el.remove());

  const errorMsg = document.createElement("div");
  input.classList.remove("is-valid");
  input.classList.add("is-invalid");
  errorMsg.classList.add("invalid-feedback");
  errorMsg.textContent = text;
  parent.classList.add("error");
  parent.append(errorMsg);
}

const $studentsList = document.getElementById("students-list"),
  $studentsListTHAll = document.querySelectorAll(
    ".studentsTable th[data-column]"
  );

const $filterForm = document.getElementById("filter-form"),
  $filterFioInp = document.getElementById("filter-fio-inp"),
  $filterFacultyInp = document.getElementById("filter-faculty-inp"),
  $filterStudyStartInp = document.getElementById("filter-studyStart-inp"),
  $filterStudyEndInp = document.getElementById("filter-studyEnd-inp"),
  $searchStudentInp = document.getElementById("search-student-inp");

// добавляем атрибут отключения автозаполнения
Array.from($filterForm.elements).forEach((el) =>
  el.setAttribute("autocomplete", "off")
);

let column = "fio",
  columnDir = true;

let manualSortApplied = false;

function newstudentTR(student) {
  const $studentTR = document.createElement("tr"),
    $fioTD = document.createElement("td"),
    $birthdayTD = document.createElement("td"),
    $studyStartTD = document.createElement("td"),
    $facultyTD = document.createElement("td"),
    $controlBlockTD = document.createElement("td"),
    $controlBlockTDWrapper = document.createElement("div"),
    $btnDelete = document.createElement("button"),
    $btnEdit = document.createElement("button");

  $fioTD.textContent = student.fio;
  $birthdayTD.textContent = `${student.getBirthdayString()} (${student.getAge()})`;
  $studyStartTD.textContent = `${student.getStudyPeriod()}`;
  $facultyTD.textContent = student.faculty;

  $controlBlockTD.classList.add("align-middle");
  $controlBlockTDWrapper.classList.add("d-flex", "justify-content-center");

  $btnDelete.classList.add("btn", "btn-danger", "w-auto", "me-1");
  $btnDelete.textContent = "Удалить";

  $btnDelete.addEventListener("click", async () => {
    try {
      const result = await serverDeleteStudent(student.id); // удаляем данные с сервера
      if (result) {
        const index = studentsList.findIndex((item) => item.id === student.id);
        if (index !== -1) studentsList.splice(index, 1);
        $studentTR.remove(); // удаляем из таблицы

        // Если удаляемый студент находится в режиме редактирования, сбрасываем форму
        if (editingStudentId === student.id) {
          resetFormToAddMode();
        }

        requestAnimationFrame(() => {
          setTimeout(() => {
            alert("Студент успешно удален!");
          }, 0);
        });
      } else {
        throw new Error("Не удалось удалить студента");
      }
    } catch (error) {
      console.error("Ошибка при удалении студента:", error);
      alert("Произошла ошибка при удалении студента!");
    }
  });

  $btnEdit.classList.add("btn", "btn-success", "w-auto");
  $btnEdit.textContent = "Изменить";

  $btnEdit.addEventListener("click", () => {
    // Заполняем форму данными студента
    populateFormWithStudentData(student);

    // Устанавливаем режим редактирования
    isEditMode = true;
    editingStudentId = student.id;

    // Изменяем текст кнопки и добавляем кнопку отмены
    updateFormForEditMode();

    // Прокручиваем к форме
    document
      .getElementById("add-student")
      .scrollIntoView({ behavior: "smooth" });
  });

  $controlBlockTDWrapper.append($btnDelete, $btnEdit);
  $controlBlockTD.append($controlBlockTDWrapper);
  $studentTR.append(
    $fioTD,
    $birthdayTD,
    $studyStartTD,
    $facultyTD,
    $controlBlockTD
  );

  return $studentTR;
}

// Функция для заполнения формы данными студента
function populateFormWithStudentData(student) {
  document.getElementById("input-surname").value = student.surname;
  document.getElementById("input-name").value = student.name;
  document.getElementById("input-lastname").value = student.lastname;

  // Форматируем дату в формат YYYY-MM-DD для input type="date"
  const birthday = new Date(student.birthday);
  const formattedDate = birthday.toISOString().split("T")[0];
  document.getElementById("input-birthday").value = formattedDate;

  document.getElementById("input-studyStart").value = student.studyStart;
  document.getElementById("input-faculty").value = student.faculty;

  // Валидируем все поля, чтобы показать правильное состояние
  inputFields.forEach((input) => {
    validateField(input);
  });
}

// Функция для обновления формы в режиме редактирования
function updateFormForEditMode() {
  const submitBtn = document.querySelector(
    '#add-student button[type="submit"]'
  );
  submitBtn.textContent = "Сохранить изменения";

  // Проверяем, есть ли уже кнопка отмены
  let cancelBtn = document.getElementById("cancel-edit-btn");
  if (!cancelBtn) {
    cancelBtn = document.createElement("button");
    cancelBtn.id = "cancel-edit-btn";
    cancelBtn.type = "button";
    cancelBtn.classList.add("btn", "btn-secondary", "ms-2");
    cancelBtn.textContent = "Отменить";

    cancelBtn.addEventListener("click", resetFormToAddMode);

    submitBtn.parentNode.appendChild(cancelBtn);
  }
}

// Функция для сброса формы в режим добавления
function resetFormToAddMode() {
  // Сбрасываем форму
  document.getElementById("add-student").reset();

  // Очищаем состояние валидации
  inputFields.forEach((input) => {
    clearValidationState(input);
  });

  // Возвращаем кнопку в исходное состояние
  const submitBtn = document.querySelector(
    '#add-student button[type="submit"]'
  );
  submitBtn.textContent = "Добавить студента";

  // Удаляем кнопку отмены, если она есть
  const cancelBtn = document.getElementById("cancel-edit-btn");
  if (cancelBtn) {
    cancelBtn.remove();
  }

  // Сбрасываем режим редактирования
  isEditMode = false;
  editingStudentId = null;
}

function getSortStudents(arr, prop, dir) {
  return arr.sort((studentA, studentB) => {
    if (studentA[prop] < studentB[prop]) return dir ? -1 : 1;
    if (studentA[prop] > studentB[prop]) return dir ? 1 : -1;
    return 0;
  });
}

// Функция фильтрации студентов
function getFilterStudents(arr, prop, value) {
  const searchValue = value.toLowerCase().trim();

  return arr.filter((student) => {
    const studentValue = String(student[prop]).toLowerCase();
    return studentValue.includes(searchValue);
  });
}

// Функция для сортировки и отображения данных
function applySortAndRender() {
  if (!studentsList || !Array.isArray(studentsList)) {
    console.error("applySortAndRender: Неверный формат данных", studentsList);
    return;
  }

  // Если сортировка не была применена вручную, устанавливаем значения по умолчанию
  if (!manualSortApplied) {
    column = "fio";
    columnDir = true;
  }

  // Сортируем данные на клиенте
  const sortedStudents = getSortStudents([...studentsList], column, columnDir);

  // Обновляем заголовки таблицы
  $studentsListTHAll.forEach((th) => {
    th.classList.remove("active");
    th.setAttribute("data-sort", "");

    if (th.dataset.column === column) {
      th.classList.add("active");
      th.setAttribute("data-sort", `${columnDir}`);
    }
  });

  // Очищаем и заполняем таблицу
  $studentsList.replaceChildren();
  for (const student of sortedStudents) {
    $studentsList.append(newstudentTR(student));
  }
}

$studentsListTHAll.forEach((e) => {
  e.addEventListener("click", function () {
    manualSortApplied = true;

    $studentsListTHAll.forEach((th) => {
      th.classList.remove("active");
      th.setAttribute("data-sort", "");
    });

    if (column === e.dataset.column) {
      columnDir = !columnDir;
    } else {
      column = this.dataset.column;
      columnDir = true;
    }

    e.setAttribute("data-sort", `${columnDir}`);
    e.classList.add("active");

    applySortAndRender();
  });
});
// преобразует переданное слово так, чтобы первая буква была заглавной, а остальные — строчными.
function capitalizeWord(word) {
  return (word = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

// Функция для валидации конкретного поля
function validateField(input) {
  let $valueInput = input.value.trim();
  const type = input.type;

  // Проверка на пустое поле
  if ($valueInput === "") {
    createError(input, "Это поле обязательно для заполнения");
    return false;
  }

  if (type === "text") {
    // только русские буквы и дефис разрешён только внутри слова, но не в начале или конце.
    const regex = /^[А-Яа-яЁё]+(-[А-Яа-яЁё]+)*$/;
    // Проверка на кириллицу
    if (!regex.test($valueInput)) {
      createError(input, "Введите только русские буквы!");
      return false;
    }

    // Проверка минимальной длины
    if ($valueInput.length < 2) {
      createError(input, "Поле должно содержать минимум 2 символа!");
      return false;
    }

    if ($valueInput.length > 20) {
      createError(input, "Поле должно содержать максимум 20 символов!");
      return false;
    }
  }

  // Проверка даты рождения
  if (type === "date") {
    const valueDate = new Date($valueInput);
    const minDate = new Date(1980, 0, 1);
    const maxDate = new Date();

    if (valueDate < minDate || valueDate > maxDate) {
      createError(
        input,
        `Дата рождения должна быть в диапазоне от ${minDate.toLocaleDateString(
          "ru-RU"
        )} до текущей даты!`
      );
      return false;
    }
  }

  // Проверка года начала обучения
  if (type === "number") {
    const yearValue = Number($valueInput);
    const currentYear = new Date().getFullYear();

    if (yearValue < 2000 || yearValue > currentYear) {
      createError(
        input,
        "Год начала обучения должен находится в диапазоне от 2000-го до текущего года!"
      );
      return false;
    }
  }

  // Если все проверки пройдены, удаляем ошибку и отмечаем как валидное
  removeError(input);
  return true;
}

// Обработчики событий для всех полей
inputFields.forEach((input) => {
  input.setAttribute("autocomplete", "off");

  // Валидация при вводе
  input.addEventListener("input", function () {
    if (input.value.trim().length > 0) {
      validateField(input);
    } else {
      clearValidationState(input);
    }
  });

  // Валидация при потере фокуса
  input.addEventListener("blur", function () {
    validateField(input);
  });

  // Сброс стилей при получении фокуса (опционально)
  input.addEventListener("focus", function () {
    if (input.value.trim().length === 0) {
      clearValidationState(input);
    }
  });
});

document
  .getElementById("add-student")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    let isFormValid = true;

    // Проверяем все поля
    inputFields.forEach((input) => {
      const isFieldValid = validateField(input);
      if (!isFieldValid) {
        isFormValid = false;
      }
    });

    if (isFormValid) {
      try {
        let $surname = document.getElementById("input-surname").value.trim();
        let $name = document.getElementById("input-name").value.trim();
        let $lastname = document.getElementById("input-lastname").value.trim();
        const $birthday = document.getElementById("input-birthday").value;
        const $studyStart = document.getElementById("input-studyStart").value;
        let $faculty = document.getElementById("input-faculty").value.trim();

        // деструктуризация массива после применения функции
        [$surname, $name, $lastname, $faculty] = [
          $surname,
          $name,
          $lastname,
          $faculty,
        ].map(capitalizeWord);

        // Создаем объект для отправки на сервер
        let studentObj = {
          name: $name,
          surname: $surname,
          lastname: $lastname,
          studyStart: Number($studyStart),
          birthday: new Date($birthday),
          faculty: $faculty,
        };

        // Отправляем данные на сервер
        let serverDataObj;

        if (isEditMode && editingStudentId) {
          // Обновляем существующего студента
          serverDataObj = await serverUpdateStudent(
            editingStudentId,
            studentObj
          );

          if (serverDataObj) {
            // Обновляем данные в списке студентов
            const index = studentsList.findIndex(
              (student) => student.id === editingStudentId
            );
            if (index !== -1) {
              studentsList[index] = new Student(
                serverDataObj.name,
                serverDataObj.surname,
                serverDataObj.lastname,
                serverDataObj.studyStart,
                new Date(serverDataObj.birthday),
                serverDataObj.faculty,
                serverDataObj.id
              );
            }

            // Сбрасываем режим редактирования
            resetFormToAddMode();

            // Обновляем таблицу
            applySortAndRender();

            requestAnimationFrame(() => {
              setTimeout(() => {
                alert("Студент успешно обновлен!");
              }, 0);
            });
          } else {
            alert("Ошибка при обновлении студента!");
          }
        } else {
          // Добавляем нового студента
          serverDataObj = await serverAddStudent(studentObj);

          if (serverDataObj) {
            // Создаем экземпляр класса Student из полученных данных
            const newStudent = new Student(
              serverDataObj.name,
              serverDataObj.surname,
              serverDataObj.lastname,
              serverDataObj.studyStart,
              new Date(serverDataObj.birthday),
              serverDataObj.faculty,
              serverDataObj.id
            );

            // Добавляем в список и обновляем отображение
            studentsList.push(newStudent);
            applySortAndRender();

            // Очищаем форму
            this.reset();
            inputFields.forEach((input) => {
              clearValidationState(input);
            });

            requestAnimationFrame(() => {
              setTimeout(() => {
                alert("Студент добавлен!");
              }, 0);
            });
          }
        }
      } catch (error) {
        console.error("Ошибка при обработке формы:", error);
        alert("Произошла ошибка при обработке данных студента!");
      }
    }
  });

$filterForm.addEventListener("submit", (event) => {
  event.preventDefault();
});

// Обработчик изменения полей фильтра
$filterForm.addEventListener("input", () => {
  debouncedFetchAndRender();
});
