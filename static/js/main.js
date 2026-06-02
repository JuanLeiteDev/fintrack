import { formValidate } from "./validate.js";
import * as api from "./api.js";

const TYPES = ['receita', 'despesa'];
const FIELDS = ['description', 'amount', 'type', 'category', 'date'];

const MESSAGES = [
    "Transação criada com sucesso!",
    "Transação atualizada com sucesso!"
];

const CHART_COLORS = {
    income: "#2E7D32",
    expense: "#C62828",
    grid: "#E3EAED",
    text: "#4F636B",
    empty: "#D6E0E4",
    categories: [
        "#2563EB",
        "#2E7D5B",
        "#B7791F",
        "#C62828",
        "#7C3AED",
        "#0891B2",
        "#DB2777",
        "#4F636B"
    ]
};

// ================ ELEMENTS ================
const elements = {
    balanceTxt: document.querySelector('#balance-txt'),
    expenseTxt: document.querySelector('#expense-txt'),
    incomeTxt: document.querySelector('#income-txt'),
    incomeExpenseCanvas: document.querySelector('#incomeExpenseChart'),
    categoryCanvas: document.querySelector('#categoryChart'),

    form: document.querySelector('#transactionForm'),
    titleForm: document.querySelector('#create-transaction > div.section-header > div > h2'),
    btnSubmit: document.querySelector('#submit-form'),

    description: document.querySelector('input#description'),
    amount: document.querySelector('input#amount'),
    type: document.querySelector('select#type'),
    category: document.querySelector('select#category'),
    date: document.querySelector('input#date'),

    transactionsList: document.querySelector('.transactions-list'),

    filterButton: document.querySelector("#filter"),
    filtersPanel: document.querySelector("#filtersPanel"),
    closeFilters: document.querySelector("#closeFilters"),
    clearFilters: document.querySelector("#clearFilters"),

    filterDescription: document.querySelector("#filterDescription"),
    filterCategory: document.querySelector("#filterCategory"),
    filterType: document.querySelector("#filterType"),
    filterDateStart: document.querySelector("#filterDateStart"),
    filterDateEnd: document.querySelector("#filterDateEnd"),
    filterValueMin: document.querySelector("#filterValueMin"),
    filterValueMax: document.querySelector("#filterValueMax"),

    inform: document.querySelector('#inform'),
    btnCancel: document.querySelector('#btn-cancel'),
    btnConfirm: document.querySelector('#btn-confirm'),

    currentTransaction: null,
    editingTransaction: null,
    timer: null,
    countTransaction: 0,
    incomeExpenseChart: null,
    categoryChart: null,

    transactions: []
};


// ================ FUNCTIONS ================
function parseAmount(value) {
    const amount = Number(String(value).replace(",", "."));
    return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(value) {
    return `€ ${value.toFixed(2).replace(".", ",")}`;
}

function updateSummary(transactions = []) {
    const summary = transactions.reduce((acc, transaction) => {
        const amount = parseAmount(transaction.amount);

        if (transaction.type === "receita") {
            acc.income += amount;
        }

        if (transaction.type === "despesa") {
            acc.expense += amount;
        }

        return acc;
    }, {
        income: 0,
        expense: 0
    });

    const balance = summary.income - summary.expense;

    elements.incomeTxt.innerText = formatMoney(summary.income);
    elements.expenseTxt.innerText = formatMoney(summary.expense);
    elements.balanceTxt.innerText = formatMoney(balance);
}

function getIncomeExpenseChartData(transactions = []) {
    const totals = transactions.reduce((acc, transaction) => {
        const amount = parseAmount(transaction.amount);

        if (transaction.type === "receita") {
            acc.income += amount;
        }

        if (transaction.type === "despesa") {
            acc.expense += amount;
        }

        return acc;
    }, {
        income: 0,
        expense: 0
    });

    return {
        labels: ["Receitas", "Despesas"],
        values: [totals.income, totals.expense]
    };
}

function getExpenseCategoryChartData(transactions = []) {
    const categories = transactions.reduce((acc, transaction) => {
        if (transaction.type !== "despesa") {
            return acc;
        }

        const category = transaction.category || "Sem categoria";
        const amount = parseAmount(transaction.amount);
        acc.set(category, (acc.get(category) ?? 0) + amount);

        return acc;
    }, new Map());

    const sortedCategories = [...categories.entries()].sort(([, firstAmount], [, secondAmount]) => {
        return secondAmount - firstAmount;
    });
    const visibleCategories = sortedCategories.slice(0, 7);
    const remainingAmount = sortedCategories.slice(7).reduce((total, [, amount]) => {
        return total + amount;
    }, 0);

    if (remainingAmount > 0) {
        visibleCategories.push(["Outras", remainingAmount]);
    }

    return {
        labels: visibleCategories.map(([category]) => category),
        values: visibleCategories.map(([, amount]) => amount)
    };
}

const emptyChartPlugin = {
    id: "emptyChartPlugin",
    afterDraw(chart, args, options) {
        const hasData = chart.data.datasets.some(dataset => {
            return dataset.data.some(value => Number(value) > 0);
        });

        if (hasData) {
            return;
        }

        const { ctx, chartArea } = chart;

        ctx.save();
        ctx.fillStyle = CHART_COLORS.text;
        ctx.font = "14px Arial, Helvetica, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
            options.message ?? "Sem dados para exibir",
            (chartArea.left + chartArea.right) / 2,
            (chartArea.top + chartArea.bottom) / 2
        );
        ctx.restore();
    }
};

function getChartJs() {
    return window.Chart;
}

function getTooltipLabel(context) {
    const label = context.dataset.label || context.label || "";
    return `${label}: ${formatMoney(Number(context.raw ?? 0))}`;
}

function renderIncomeExpenseChart(transactions = []) {
    const Chart = getChartJs();

    if (!Chart || !elements.incomeExpenseCanvas) {
        return;
    }

    const chartData = getIncomeExpenseChartData(transactions);
    const hasData = chartData.values.some(value => value > 0);
    const labels = hasData ? chartData.labels : ["Sem dados"];
    const values = hasData ? chartData.values : [0];
    const colors = hasData
        ? [CHART_COLORS.income, CHART_COLORS.expense]
        : [CHART_COLORS.empty];

    const data = {
        labels,
        datasets: [
            {
                label: "Total",
                data: values,
                backgroundColor: colors,
                borderColor: "#FFFFFF",
                borderWidth: 2
            }
        ]
    };

    if (!elements.incomeExpenseChart) {
        elements.incomeExpenseChart = new Chart(elements.incomeExpenseCanvas, {
            type: "pie",
            data,
            plugins: [emptyChartPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    emptyChartPlugin: {
                        message: "Sem receitas ou despesas para exibir"
                    },
                    legend: {
                        position: "bottom",
                        labels: {
                            color: CHART_COLORS.text,
                            boxWidth: 12,
                            boxHeight: 12
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: getTooltipLabel
                        }
                    }
                }
            }
        });

        return;
    }

    elements.incomeExpenseChart.data = data;
    elements.incomeExpenseChart.update();
}

function renderCategoryChart(transactions = []) {
    const Chart = getChartJs();

    if (!Chart || !elements.categoryCanvas) {
        return;
    }

    const chartData = getExpenseCategoryChartData(transactions);
    const labels = chartData.labels.length > 0 ? chartData.labels : ["Sem dados"];
    const values = chartData.values.length > 0 ? chartData.values : [0];
    const colors = labels.map((label, index) => {
        if (label === "Sem dados") {
            return CHART_COLORS.empty;
        }

        return CHART_COLORS.categories[index % CHART_COLORS.categories.length];
    });

    const data = {
        labels,
        datasets: [
            {
                label: "Despesas",
                data: values,
                backgroundColor: colors,
                borderColor: "#FFFFFF",
                borderWidth: 2
            }
        ]
    };

    if (!elements.categoryChart) {
        elements.categoryChart = new Chart(elements.categoryCanvas, {
            type: "pie",
            data,
            plugins: [emptyChartPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    emptyChartPlugin: {
                        message: "Sem despesas por categoria"
                    },
                    legend: {
                        position: "bottom",
                        labels: {
                            color: CHART_COLORS.text,
                            boxWidth: 12,
                            boxHeight: 12
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: getTooltipLabel
                        }
                    }
                }
            }
        });

        return;
    }

    elements.categoryChart.data = data;
    elements.categoryChart.update();
}

function renderCharts(transactions = []) {
    renderIncomeExpenseChart(transactions);
    renderCategoryChart(transactions);
}

function initTimeout() {
    clearTimeout(elements.timer);

    elements.timer = setTimeout(() => {
        elements.inform.classList.add('inform-ocult');
    }, 3000);
}

function cancelTimeout() {
    clearTimeout(elements.timer);
}

function showInform(msg, buttons = false, error = false) {
    cancelTimeout();

    if (elements.inform.classList.contains('inform-ocult')) {
        elements.inform.classList.remove('inform-ocult');
    }

    const msgElement = elements.inform.firstElementChild;
    const buttonsBox = elements.inform.querySelector("#confirm-box");

    if (msgElement) msgElement.innerText = msg;

    if (!buttons) {
        const color = error ? "var(--danger)" : "var(--success)";
        elements.inform.style.borderColor = color;
        msgElement.style.color = color;
        buttonsBox.style.display = "none";
        initTimeout();
    } else {
        elements.inform.style.borderColor = "var(--danger)";
        msgElement.style.color = "var(--danger)";
        buttonsBox.style.display = "flex";
    }
}

function readForm() {
    return {
        description: elements.description.value,
        amount: elements.amount.value,
        type: elements.type.value,
        category: elements.category.value,
        date: elements.date.value,
    };
}

function escapeHtml(value) {
    const element = document.createElement('span');
    element.textContent = String(value ?? "");
    return element.innerHTML;
}

function showErrors(errors) {
    if (!Array.isArray(errors)) {
        showInform("Erro ao tentar processar os dados.", false, true);
        return;
    }

    for (const error of errors) {
        const key = Object.keys(error)[0];
        const value = Object.values(error)[0];
        const field = elements[key];

        if (!field) {
            showInform(value, false, true);
            continue;
        }

        const nextElement = field.nextElementSibling;

        if (!nextElement || !nextElement.classList.contains('error')) {
            const newElement = document.createElement('p');
            newElement.classList.add('error');
            newElement.innerText = value;
            field.after(newElement);
        } else {
            nextElement.innerText = value;
        }

        field.classList.add('input-error');
    }
}

function formatTransaction(transaction) {
    const amount = Number(transaction.amount);
    const category = String(transaction.category ?? "");
    const date = String(transaction.date ?? "");

    return {
        id: transaction.id,
        description: String(transaction.description ?? ""),
        amount: Number.isFinite(amount) ? amount.toFixed(2).replace(".", ",") : "0,00",
        type: String(transaction.type ?? ""),
        category: category.charAt(0).toUpperCase() + category.slice(1),
        date: date.includes("-") ? date.split('-').reverse().join('/') : date
    };
}

function emptyList(empty = true) {
    if (empty) {
        elements.transactionsList.innerHTML = '<p class="empty-transactions">Nenhuma transação cadastrada.</p>';
    } else {
        const emptyMessage = elements.transactionsList.querySelector('.empty-transactions');
        if (emptyMessage) emptyMessage.remove();
    }
}

function clearTransactionsList() {
    elements.transactionsList.innerHTML = "";
    elements.countTransaction = 0;
}

function renderTransactions(transactions) {
    clearTransactionsList();

    updateSummary(transactions);
    renderCharts(transactions);

    if (!Array.isArray(transactions) || transactions.length === 0) {
        elements.transactionsList.innerHTML = '<p class="empty-transactions">Nenhuma transação encontrada.</p>';
        return;
    }

    transactions.forEach(transaction => {
        updateTransactions(transaction);
    });
}

function readFilters() {
    return {
        description: elements.filterDescription.value.trim().toLowerCase(),
        category: elements.filterCategory.value,
        type: elements.filterType.value,
        dateStart: elements.filterDateStart.value,
        dateEnd: elements.filterDateEnd.value,
        valueMin: elements.filterValueMin.value,
        valueMax: elements.filterValueMax.value
    };
}

function applyFilters() {
    const filters = readFilters();

    const filteredTransactions = elements.transactions.filter(transaction => {
        const description = transaction.description.toLowerCase();
        const category = transaction.category;
        const type = transaction.type;

        const amount = Number(
            String(transaction.amount).replace(",", ".")
        );

        const date = transaction.date.includes("/")
            ? transaction.date.split("/").reverse().join("-")
            : transaction.date;

        if (filters.description && !description.includes(filters.description)) {
            return false;
        }

        if (filters.category && category !== filters.category) {
            return false;
        }

        if (filters.type && type !== filters.type) {
            return false;
        }

        if (filters.dateStart && date < filters.dateStart) {
            return false;
        }

        if (filters.dateEnd && date > filters.dateEnd) {
            return false;
        }

        if (filters.valueMin && amount < Number(filters.valueMin)) {
            return false;
        }

        if (filters.valueMax && amount > Number(filters.valueMax)) {
            return false;
        }

        return true;
    });

    renderTransactions(filteredTransactions);
}

async function saveForm(event) {
    event.preventDefault();

    const dataForm = readForm();
    const errors = formValidate(dataForm);

    if (errors) {
        showErrors(errors);
        return;
    }

    if (elements.editingTransaction != null) {
        const updatedTransaction = await api.updateExistingTransaction(
            dataForm,
            elements.currentTransaction.dataset.id
        );

        if (updatedTransaction.sucesse) {
            const formattedTransaction = formatTransaction(updatedTransaction.body);

            elements.transactions = elements.transactions.map(transaction => {
                if (String(transaction.id) === String(formattedTransaction.id)) {
                    return formattedTransaction;
                }

                return transaction;
            });

            showInform(MESSAGES[1], false, false);
            applyFilters();
        } else {
            showInform(updatedTransaction.message, false, true);
        }

        elements.form.reset();
        elements.btnSubmit.innerText = "Salvar transação";
        elements.titleForm.innerText = "Cria nova transação";
        elements.editingTransaction = null;
        elements.currentTransaction = null;

    } else {
        const newData = await api.sendNewTransaction(dataForm);

        if (newData.sucesse) {
            const formattedTransaction = formatTransaction(newData.body);

            elements.form.reset();
            elements.transactions.unshift(formattedTransaction);

            showInform(MESSAGES[0]);
            applyFilters();
        } else {
            showErrors(newData.body ?? [{ form: newData.message ?? "Erro ao salvar transação." }]);
        }
    }
}

async function showTransactions() {
    const response = await api.loadTransactions();

    if (response.sucesse) {
        const transactions = response.body ?? [];

        if (Array.isArray(transactions) && transactions.length > 0) {
            elements.transactions = transactions.map(transaction => {
                return formatTransaction(transaction);
            });

            renderTransactions(elements.transactions);
        } else {
            elements.transactions = [];
            renderTransactions(elements.transactions);
        }
    } else {
        emptyList();
        if (response.message) showInform(response.message, false, true);
        elements.transactions = [];
        updateSummary();
        renderCharts();
    }
}

function updateTransactions(newTransaction) {
    if (elements.countTransaction == 0) emptyList(false);

    const newArticle = document.createElement('article');
    newArticle.classList.add('transaction-item');
    newArticle.dataset.id = newTransaction.id;

    const isIncome = newTransaction.type === TYPES[0];

    newArticle.innerHTML =
        `
        <div class="transaction-info">
            <h3>${escapeHtml(newTransaction.description)}</h3>
            <p>${isIncome ? "Receita" : "Despesa"} • ${escapeHtml(newTransaction.category)} • ${escapeHtml(newTransaction.date)}</p>
        </div>

        <div class="transaction-value ${isIncome ? "income" : "expense"}">
            <strong>${isIncome ? "+" : "-"} € ${escapeHtml(newTransaction.amount)}</strong>
        </div>

        <div class="transaction-actions">
            <button type="button" class="btn-secondary edit">Editar</button>
            <button type="button" class="btn-secondary delete">Apagar</button>
        </div>
    `;

    elements.transactionsList.prepend(newArticle);

    elements.countTransaction++;

    const btnDelete = newArticle.querySelector('.delete');
    const btnEdit = newArticle.querySelector('.edit');

    btnDelete.addEventListener('click', () => {
        elements.currentTransaction = newArticle;
        showInform("Deseja apagar essa transação?", true);
    });

    btnEdit.addEventListener('click', () => {
        elements.currentTransaction = newArticle;
        elements.editingTransaction = newTransaction;
        updateOne();
    });
}

function updateOne() {
    elements.form.reset();

    elements.description.value = elements.editingTransaction.description;
    elements.amount.value = elements.editingTransaction.amount.replace(",", ".");
    elements.type.value = elements.editingTransaction.type;
    elements.category.value = elements.editingTransaction.category;
    elements.date.value = elements.editingTransaction.date.split("/").reverse().join("-");

    elements.btnSubmit.innerText = "Atualizar transação";
    elements.titleForm.innerText = "Atualizar transação existente";

    document.querySelector('#create-transaction').scrollIntoView({ behavior: 'smooth' });
}

// ================ EVENTS ================
elements.form.addEventListener("submit", saveForm);

elements.filterButton.addEventListener("click", () => {
    elements.filtersPanel.classList.toggle("hidden");
});

elements.closeFilters.addEventListener("click", () => {
    elements.filtersPanel.classList.add("hidden");
});

[
    elements.filterDescription,
    elements.filterCategory,
    elements.filterType,
    elements.filterDateStart,
    elements.filterDateEnd,
    elements.filterValueMin,
    elements.filterValueMax
].forEach(filterElement => {
    filterElement.addEventListener("input", applyFilters);
    filterElement.addEventListener("change", applyFilters);
});

elements.clearFilters.addEventListener("click", () => {
    elements.filterDescription.value = "";
    elements.filterCategory.value = "";
    elements.filterType.value = "";
    elements.filterDateStart.value = "";
    elements.filterDateEnd.value = "";
    elements.filterValueMin.value = "";
    elements.filterValueMax.value = "";

    renderTransactions(elements.transactions);
});

FIELDS.forEach(field => {
    const btnInput = document.querySelector(`#${field}`);

    btnInput.addEventListener('input', () => {
        if (btnInput.classList.contains('input-error')) {
            btnInput.classList.remove('input-error');

            if (btnInput.nextElementSibling?.classList.contains('error')) {
                btnInput.nextElementSibling.remove();
            }
        }
    });
});

elements.btnCancel.addEventListener('click', () => {
    elements.inform.classList.add('inform-ocult');
    elements.currentTransaction = null;
});

elements.btnConfirm.addEventListener('click', async () => {
    if (elements.currentTransaction) {
        const deletedId = elements.currentTransaction.dataset.id;

        const response = await api.deleteTransaction(deletedId);

        if (response.sucesse) {
            elements.transactions = elements.transactions.filter(transaction => {
                return String(transaction.id) !== String(deletedId);
            });

            elements.currentTransaction = null;

            showInform("Transação apagada com sucesso!");
            applyFilters();
        } else {
            showInform("Erro ao tentar apagar uma transação.", false, true);
        }
    } else {
        showInform("Nenhuma transação informada.", false, true);
    }
});

showTransactions();
