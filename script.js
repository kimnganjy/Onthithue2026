function renderWrongStats() {
    const panel =
        document.getElementById(
            "wrongStatsPanel"
        );

    const data =
        JSON.parse(
            localStorage.getItem(
                "wrongStats"
            )
        ) || {};

    const arr =
        Object.values(data);

    arr.sort(
        (a, b) =>
            b.count - a.count
    );

    let html = `
        <h2>
            🔥 Các câu sai thường gặp
        </h2>
    `;

    if (arr.length === 0) {

        html += `
            <p>
                Chưa có dữ liệu.
            </p>
        `;
    } else {

        arr.forEach((item, index) => {

            let optionsHtml = "";

            if (item.options && Array.isArray(item.options)) {

                item.options.forEach((opt, i) => {

                    const letter =
                        String.fromCharCode(65 + i);

                    const cls =
                        letter === item.answer
                            ? "correct"
                            : "";

                    optionsHtml += `
                        <div
                            class="${cls}"
                            style="padding:8px;margin:5px 0;"
                        >
                            <b>${letter}.</b>
                            ${opt}
                        </div>
                    `;
                });

            } else {

                optionsHtml = `
                    <div class="answer-box">
                        Đáp án đúng: ${item.answer}
                    </div>
                `;
            }

            html += `
                <div class="review-item">
                    <h4>
                        ⚡Câu ${item.id}
                        <span class="badge-wrong">
                            ❌ Sai ${item.count} lần
                        </span>
                    </h4>
                    <h4>
                        <b>Chủ đề:</b>
                        ${item.topic}
                    </h4>
                    <p style="margin-top:10px;">
                        ${item.question}
                    </p>
                    ${optionsHtml}
                    <div class="answer-box">
                        Đáp án đúng:
                        ${item.answer}
                    </div>
                </div>
            `;
        });
    }

    panel.innerHTML = html;
}
