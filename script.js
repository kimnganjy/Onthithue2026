/****************************
 * STORAGE SAFE
 ****************************/
const Storage = {
    get(key, fallback = {}) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch {
            return fallback;
        }
    },

    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    remove(key) {
        localStorage.removeItem(key);
    }
};

/****************************
 * STATE
 ****************************/
const State = {
    selectedQuestions: [],
    userAnswers: {},
    wrongStats: Storage.get("wrongStats", {}),
    startTime: null,
    timer: null,
    timeLeft: 0
};

/****************************
 * DOM ROOTS
 ****************************/
const setupDiv = document.getElementById("setup");
const quizContainer = document.getElementById("quizContainer");
const resultContainer = document.getElementById("resultContainer");

const questionsDiv = document.getElementById("questions");
const timerDiv = document.getElementById("timer");

/****************************
 * USER KEY (FIX QUAN TRỌNG)
 ****************************/
function getUserKey() {
    const name = document.getElementById("userName")?.value?.trim();

    if (!name) {
        alert("Vui lòng nhập họ tên trước khi sử dụng chức năng này");
        return null;
    }

    // FIX: chuẩn hóa key tránh lệch dữ liệu
    return "wrongQuestionBank_" + name.trim().toLowerCase();
}

/****************************
 * UTIL
 ****************************/
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

async function loadTopic(fileName) {
    const res = await fetch(`data/${fileName}.json`);
    return await res.json();
}

/****************************
 * RENDER QUESTIONS
 ****************************/
function renderQuestions() {
    questionsDiv.innerHTML = "";

    State.selectedQuestions.forEach((q, index) => {
        const div = document.createElement("div");
        div.className = "question";

        div.innerHTML = `
            <h3>Câu ${index + 1}. ${q.question}</h3>
            ${q.options.map((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                return `
                    <label>
                        <input type="radio" name="q${index}" value="${letter}">
                        <b>${letter}.</b> ${opt}
                    </label><br>
                `;
            }).join("")}
        `;

        questionsDiv.appendChild(div);
    });
}

/****************************
 * TIMER
 ****************************/
function startTimer(minutes) {
    State.timeLeft = minutes * 60;
    updateTimer();

    clearInterval(State.timer);

    State.timer = setInterval(() => {
        State.timeLeft--;
        updateTimer();

        if (State.timeLeft <= 0) {
            clearInterval(State.timer);
            alert("Hết thời gian!");
        }
    }, 1000);
}

function updateTimer() {
    const m = Math.floor(State.timeLeft / 60);
    const s = State.timeLeft % 60;

    timerDiv.innerText =
        String(m).padStart(2, "0") + ":" +
        String(s).padStart(2, "0");
}

/****************************
 * COLLECT ANSWERS
 ****************************/
function collectAnswers() {
    State.userAnswers = {};

    State.selectedQuestions.forEach((q, index) => {
        const selected = document.querySelector(
            `input[name="q${index}"]:checked`
        );

        if (selected) {
            State.userAnswers[index] = selected.value;
        }
    });
}

/****************************
 * START QUIZ
 ****************************/
async function startQuiz() {
    const checked = document.querySelectorAll(
        '.topics input[type="checkbox"]:checked'
    );

    if (!checked.length) {
        alert("Chọn ít nhất 1 chủ đề");
        return;
    }

    const questionCount =
        document.getElementById("questionCount").value;

    let all = [];

    for (const t of checked) {
        const data = await loadTopic(t.value);

        all.push(...data.questions.map(q => ({
            ...q,
            topic: data.topic
        })));
    }

    shuffle(all);

    State.selectedQuestions =
        questionCount === "full"
            ? all
            : all.slice(0, Number(questionCount));

    setupDiv.style.display = "none";
    quizContainer.style.display = "block";

    renderQuestions();

    const minutes =
        questionCount === "full"
            ? Math.max(10, Math.ceil(State.selectedQuestions.length / 2))
            : Number(questionCount);

    startTimer(minutes);

    State.startTime = Date.now();
}

/****************************
 * SUBMIT QUIZ (FIX SAVE DATA)
 ****************************/
function submitQuiz() {
    clearInterval(State.timer);

    collectAnswers();

    const key = getUserKey();
    if (!key) return;

    let wrongBank = Storage.get(key, {});

    let correct = 0;
    let wrong = 0;

    const wrongCurrent = [];

    State.selectedQuestions.forEach((q, i) => {
        const ans = State.userAnswers[i];
        const k = `${q.topic}_${q.id}`;

        if (ans === q.answer) {
            correct++;
            delete wrongBank[k];
        } else {
            wrong++;
            wrongCurrent.push(q);

            State.wrongStats[k] ??= { ...q, count: 0 };
            State.wrongStats[k].count++;

            wrongBank[k] = q;
        }
    });

    Storage.set("wrongStats", State.wrongStats);
    Storage.set(key, wrongBank);

    // 🔥 FIX QUAN TRỌNG: lưu lại current wrong
    State.wrongCurrent = wrongCurrent;

    const spent =
        Math.floor((Date.now() - State.startTime) / 1000);

    quizContainer.style.display = "none";
    resultContainer.style.display = "block";

    document.getElementById("score").innerHTML = `
        <p>Đúng: ${correct}</p>
        <p>Sai: ${wrong}</p>
        <p>Thời gian: ${spent}s</p>
    `;

    renderReview();
    renderWrongStats();

    // 🔥 FIX HIỆN NÚT LÀM LẠI CÂU SAI
    const retryBtn = document.getElementById("retryWrongBtn");
    if (retryBtn) {
        retryBtn.style.display =
            wrongCurrent.length > 0 ? "inline-block" : "none";

        retryBtn.innerHTML =
            `🔥 Làm lại ${wrongCurrent.length} câu sai`;
    }
}

/****************************
 * REVIEW
 ****************************/
function renderReview() {
    const review = document.getElementById("review");
    review.innerHTML = "";

    State.selectedQuestions.forEach((q, i) => {
        const userAnswer = State.userAnswers[i];
        const isCorrect = userAnswer === q.answer;

        let options = "";

        q.options.forEach((opt, idx) => {
            const letter = String.fromCharCode(65 + idx);

            let cls = "";
            if (letter === q.answer) cls = "correct";
            if (userAnswer === letter && letter !== q.answer) cls = "wrong";

            options += `
                <div class="${cls}" style="padding:8px;margin:5px 0;">
                    <b>${letter}.</b> ${opt}
                </div>
            `;
        });

        review.innerHTML += `
            <div class="review-item">
                <h4>Câu ${i + 1}</h4>
                <p>${q.question}</p>
                ${options}
                <div class="answer-box">Đáp án: ${q.answer}</div>
            </div>
        `;
    });
}

/****************************
 * WRONG STATS
 ****************************/
function renderWrongStats() {
    const panel = document.getElementById("wrongStatsPanel");
    const data = Storage.get("wrongStats", {});

    const arr = Object.values(data)
        .sort((a, b) => b.count - a.count);

    let html = `<h2>🔥 Câu sai thường gặp</h2>`;

    if (!arr.length) {
        panel.innerHTML = html + "<p>Chưa có dữ liệu</p>";
        return;
    }

    arr.forEach(item => {
        html += `
            <div class="review-item">
                <h4>⚡ Sai ${item.count} lần</h4>
                <p>${item.question}</p>
                <div class="answer-box">Đáp án: ${item.answer}</div>
            </div>
        `;
    });

    panel.innerHTML = html;
}

/****************************
 * EVENT SYSTEM (PRO FIX)
 ****************************/
document.addEventListener("click", (e) => {
    const id = e.target?.id;

    switch (id) {

        case "startBtn":
            startQuiz();
            break;

        case "submitBtn":
            submitQuiz();
            break;

        case "reviewWrongBtn": {
            const key = getUserKey();
            if (!key) return;

            const arr =
                Object.values(Storage.get(key, {}));

            if (!arr.length) {
                alert("Chưa có câu sai nào để ôn tập.");
                return;
            }

            State.selectedQuestions = arr;

            setupDiv.style.display = "none";
            resultContainer.style.display = "none";
            quizContainer.style.display = "block";

            renderQuestions();

            State.startTime = Date.now();
            startTimer(Math.max(5, arr.length));
            break;
        }

        case "retryWrongBtn": {
            const key = getUserKey();
            if (!key) return;

            const arr =
                Object.values(Storage.get(key, {}));

            if (!arr.length) {
                alert("Không có câu sai.");
                return;
            }

            State.selectedQuestions = arr;

            setupDiv.style.display = "none";
            resultContainer.style.display = "none";
            quizContainer.style.display = "block";

            renderQuestions();

            State.startTime = Date.now();
            startTimer(Math.max(5, arr.length));
            break;
        }

        case "clearWrongStatsBtn":
            if (confirm("Xóa thống kê?")) {
                Storage.remove("wrongStats");
                renderWrongStats();
            }
            break;
    }
});
