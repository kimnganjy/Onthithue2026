/****************************
 * STORAGE HELPER
 ****************************/
const Storage = {
    get(key, fallback = null) {
        try {
            return JSON.parse(localStorage.getItem(key)) ?? fallback;
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
 * STATE (GLOBAL CLEAN)
 ****************************/
const State = {
    selectedQuestions: [],
    userAnswers: {},
    wrongCurrent: [],
    wrongStats: Storage.get("wrongStats", {}),
    wrongBank: {},
    startTime: null,
    timer: null,
    timeLeft: 0
};

/****************************
 * DOM ELEMENTS
 ****************************/
const startBtn = document.getElementById("startBtn");
const submitBtn = document.getElementById("submitBtn");

const setupDiv = document.getElementById("setup");
const quizContainer = document.getElementById("quizContainer");
const resultContainer = document.getElementById("resultContainer");

const questionsDiv = document.getElementById("questions");
const timerDiv = document.getElementById("timer");

/****************************
 * TOPIC FILES
 ****************************/
const TOPIC_FILES = [
    "congchuccongvu",
    "hkd_cnkd",
    "luatqlt",
    "kekhaiktt",
    "khieunaitocao",
    "pcthamnhung",
    "quychektnb",
    "quytrinhktra",
    "thuegtgt",
    "thuetndn",
    "thuetncn",
    "xuphatvphc"
];

/****************************
 * USER KEY
 ****************************/
function getUserKey() {
    const name = document.getElementById("userName")?.value?.trim();
    if (!name) {
        alert("Vui lòng nhập họ tên");
        return null;
    }
    return "wrongQuestionBank_" + name;
}

/****************************
 * UTILS
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
    const checkedTopics = document.querySelectorAll(
        '.topics input[type="checkbox"]:checked'
    );

    if (!checkedTopics.length) {
        alert("Vui lòng chọn ít nhất 1 chủ đề");
        return;
    }

    const questionCount = document.getElementById("questionCount").value;

    let allQuestions = [];

    for (const topic of checkedTopics) {
        const data = await loadTopic(topic.value);

        allQuestions.push(
            ...data.questions.map(q => ({
                ...q,
                topic: data.topic
            }))
        );
    }

    if (
        questionCount !== "full" &&
        allQuestions.length < Number(questionCount)
    ) {
        alert("Không đủ câu hỏi");
        return;
    }

    const shuffled = shuffle(allQuestions);

    State.selectedQuestions =
        questionCount === "full"
            ? shuffled
            : shuffled.slice(0, Number(questionCount));

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
 * SUBMIT QUIZ
 ****************************/
function submitQuiz() {
    clearInterval(State.timer);

    collectAnswers();

    const wrongKey = getUserKey();
    if (!wrongKey) return;

    let wrongBank = Storage.get(wrongKey, {});

    let correct = 0;
    let wrong = 0;

    State.wrongCurrent = [];

    State.selectedQuestions.forEach((q, index) => {
        const ans = State.userAnswers[index];
        const key = `${q.topic}_${q.id}`;

        if (ans === q.answer) {
            correct++;
            delete wrongBank[key];
        } else {
            wrong++;
            State.wrongCurrent.push(q);

            State.wrongStats[key] ??= {
                ...q,
                count: 0
            };

            State.wrongStats[key].count++;

            wrongBank[key] = q;
        }
    });

    Storage.set("wrongStats", State.wrongStats);
    Storage.set(wrongKey, wrongBank);

    const timeSpent = Math.floor((Date.now() - State.startTime) / 1000);

    quizContainer.style.display = "none";
    resultContainer.style.display = "block";

    document.getElementById("score").innerHTML = `
        <div class="result-summary">
            <p>📌 Tổng: <b>${State.selectedQuestions.length}</b></p>
            <p>✅ Đúng: <b>${correct}</b></p>
            <p>❌ Sai: <b>${wrong}</b></p>
            <p>⏱ Thời gian: <b>${timeSpent}s</b></p>
        </div>
    `;

    renderReview();
    renderWrongStats();
}

/****************************
 * REVIEW
 ****************************/
function renderReview() {
    const review = document.getElementById("review");
    review.innerHTML = "";

    State.selectedQuestions.forEach((q, index) => {
        const userAnswer = State.userAnswers[index];
        const isCorrect = userAnswer === q.answer;

        let optionsHtml = "";

        q.options.forEach((opt, i) => {
            const letter = String.fromCharCode(65 + i);

            let cls = "";
            if (letter === q.answer) cls = "correct";
            if (userAnswer === letter && letter !== q.answer) cls = "wrong";

            optionsHtml += `
                <div class="${cls}" style="padding:8px;margin:5px 0;">
                    <b>${letter}.</b> ${opt}
                </div>
            `;
        });

        review.innerHTML += `
            <div class="review-item">
                <h4>
                    Câu ${index + 1}
                    ${isCorrect
                        ? '<span class="badge-correct">Đúng</span>'
                        : '<span class="badge-wrong">Sai</span>'
                    }
                </h4>

                <p>${q.question}</p>

                ${optionsHtml}

                <div class="answer-box">
                    Đáp án đúng: ${q.answer}
                </div>
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
    const arr = Object.values(data).sort((a, b) => b.count - a.count);

    let html = `<h2>🔥 Câu sai thường gặp</h2>`;

    if (!arr.length) {
        html += `<p>Chưa có dữ liệu</p>`;
        panel.innerHTML = html;
        return;
    }

    arr.forEach(item => {
        html += `
            <div class="review-item">
                <h4>⚡ ${item.id} <span class="badge-wrong">Sai ${item.count}</span></h4>
                <p>${item.question}</p>
                <div class="answer-box">Đáp án: ${item.answer}</div>
            </div>
        `;
    });

    panel.innerHTML = html;
}

/****************************
 * EVENTS
 ****************************/
startBtn.addEventListener("click", startQuiz);
submitBtn.addEventListener("click", submitQuiz);

/****************************
 * INIT USER DATA
 ****************************/
document.getElementById("userName").value =
    localStorage.getItem("userName") || "";

document.getElementById("userOffice").value =
    localStorage.getItem("userOffice") || "";
