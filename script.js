const startBtn = document.getElementById("startBtn");
const submitBtn = document.getElementById("submitBtn");

const setupDiv = document.getElementById("setup");
const quizContainer = document.getElementById("quizContainer");
const resultContainer = document.getElementById("resultContainer");

const questionsDiv = document.getElementById("questions");
const timerDiv = document.getElementById("timer");

let selectedQuestions = [];
let userAnswers = {};

let wrongQuestionsCurrentTest = [];

let timer;
let timeLeft = 0;

// ================================
// THÊM: thời gian làm bài
// ================================
let startTime = null;

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

// ================================
// SHUFFLE
// ================================
function shuffle(array) {

    for (let i = array.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [array[i], array[j]] =
        [array[j], array[i]];
    }

    return array;
}

// ================================
// LOAD DATA
// ================================
async function loadTopic(fileName) {

    const response =
        await fetch(`data/${fileName}.json`);

    return await response.json();
}

// ================================
// START QUIZ
// ================================
async function startQuiz() {

    const checkedTopics =
        document.querySelectorAll(
            '.topics input[type="checkbox"]:checked'
        );

    if (checkedTopics.length === 0) {

        alert("Vui lòng chọn ít nhất 1 chủ đề");

        return;
    }

    const questionCount =
        document.getElementById("questionCount").value;

    let allQuestions = [];

    for (const topic of checkedTopics) {

        const data =
            await loadTopic(topic.value);

        const questions =
            data.questions.map(q => ({

                ...q,

                topic: data.topic
            }));

        allQuestions.push(...questions);
    }

    if (
        questionCount !== "full" &&
        allQuestions.length < Number(questionCount)
    ) {

        alert("Tổng số câu hỏi không đủ.");

        return;
    }

    shuffle(allQuestions);

    if (questionCount === "full") {

        selectedQuestions = allQuestions;

    } else {

        selectedQuestions =
            allQuestions.slice(0, Number(questionCount));
    }

    setupDiv.style.display = "none";
    quizContainer.style.display = "block";

    renderQuestions();

    const timerMinutes =
    questionCount === "full"
        ? Math.ceil(selectedQuestions.length / 2)
        : Number(questionCount);

    startTimer(timerMinutes);

    // ============================
    // GHI THỜI GIAN BẮT ĐẦU
    // ============================
    startTime = Date.now();
}

// ================================
// RENDER QUESTIONS
// ================================
function renderQuestions() {

    questionsDiv.innerHTML = "";

    selectedQuestions.forEach((q, index) => {

        const div =
            document.createElement("div");

        div.className = "question";

        div.innerHTML = `

            <h3>
                Câu ${index + 1}. ${q.question}
            </h3>

            ${q.options.map((opt, i) => {

                const letter =
                    String.fromCharCode(65 + i);

                return `

                    <div class="option">

                        <label>

                            <input
                                type="radio"
                                name="q${index}"
                                value="${letter}"
                            >

                            <b>${letter}.</b>
                            ${opt}

                        </label>

                    </div>

                `;

            }).join("")}

        `;

        questionsDiv.appendChild(div);

    });
}

// ================================
// TIMER
// ================================
function startTimer(minutes) {

    timeLeft = minutes * 60;

    updateTimer();

    timer =
        setInterval(() => {

            timeLeft--;

            updateTimer();

            if (timeLeft <= 0) {

                clearInterval(timer);

                alert(
                    "Đã hết thời gian. Bạn vẫn có thể nộp bài."
                );

            }

        }, 1000);
}

// ================================
// UPDATE TIMER
// ================================
function updateTimer() {

    const minutes =
        Math.floor(timeLeft / 60);

    const seconds =
        timeLeft % 60;

    timerDiv.innerText =
        String(minutes).padStart(2, "0")
        + ":"
        + String(seconds).padStart(2, "0");
}

// ================================
// COLLECT ANSWERS
// ================================
function collectAnswers() {

    userAnswers = {};

    selectedQuestions.forEach((q, index) => {

        const selected =
            document.querySelector(
                `input[name="q${index}"]:checked`
            );

        if (selected) {

            userAnswers[index] =
                selected.value;
        }

    });

}

// ================================
// SUBMIT QUIZ
// ================================
function submitQuiz() {

    clearInterval(timer);

    collectAnswers();

    let correct = 0;
    let wrong = 0;

    wrongQuestionsCurrentTest = [];

    selectedQuestions.forEach((q, index) => {

        const answer =
            userAnswers[index];

        if (answer === q.answer) {

            correct++;

        } else {

            wrong++;
            wrongQuestionsCurrentTest.push(q);

        }

    });

    const percent =
        (correct / selectedQuestions.length) * 100;

    localStorage.setItem(
        "wrongQuestionsCurrentTest",
        JSON.stringify(wrongQuestionsCurrentTest)
    );

    // ============================
    // THỜI GIAN HOÀN THÀNH
    // ============================
    const endTime = Date.now();

    const timeSpent =
        Math.floor((endTime - startTime) / 1000);

    const spentMinutes =
        Math.floor(timeSpent / 60);

    const spentSeconds =
        timeSpent % 60;

    quizContainer.style.display = "none";
    resultContainer.style.display = "block";

    // ============================
    // DASHBOARD KẾT QUẢ
    // ============================
    document.getElementById("score").innerHTML = `

        <div class="result-summary">

            <p>
                📌 Tổng số câu:
                <b>${selectedQuestions.length}</b>
            </p>

            <p>
                ✅ Đúng:
                <b>${correct}</b>
            </p>

            <p>
                ❌ Sai:
                <b>${wrong}</b>
            </p>

            <p>
                📊 Tỷ lệ đúng:
                <b>${percent.toFixed(2)}%</b>
            </p>

            <p>
                ⏱ Thời gian làm bài:
                <b>
                    ${String(spentMinutes).padStart(2, "0")}
                    :
                    ${String(spentSeconds).padStart(2, "0")}
                </b>
            </p>

        </div>

    `;

    renderReview();

}

// ================================
// REVIEW ANSWERS
// ================================
function renderReview() {

    const review =
        document.getElementById("review");

    review.innerHTML = "";

    selectedQuestions.forEach((q, index) => {

        const userAnswer =
            userAnswers[index];

        const isCorrect =
            userAnswer === q.answer;

        const div =
            document.createElement("div");

        div.className = "review-item";

        let optionsHtml = "";

        q.options.forEach((opt, i) => {

            const letter =
                String.fromCharCode(65 + i);

            let cls = "";

            if (
                userAnswer === letter &&
                letter !== q.answer
            ) {
                cls = "wrong";
            }

            if (letter === q.answer) {
                cls = "correct";
            }

            optionsHtml += `

                <div class="${cls}" style="padding:8px;margin:5px 0;">

                    <b>${letter}.</b> ${opt}

                </div>

            `;

        });

        div.innerHTML = `

            <h4>
                Câu ${index + 1}
                ${
                    isCorrect
                    ? '<span class="badge-correct">Đúng</span>'
                    : '<span class="badge-wrong">Sai</span>'
                }
            </h4>

            <p><b>Chủ đề:</b> ${q.topic}</p>

            <p style="margin-top:10px;">
                ${q.question}
            </p>

            ${optionsHtml}

            <div class="answer-box">
                Đáp án đúng: ${q.answer}
            </div>

        `;

        review.appendChild(div);

    });

}

// ================================
// EVENT
// ================================
startBtn.addEventListener("click", startQuiz);
submitBtn.addEventListener("click", submitQuiz);
