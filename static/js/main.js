import { formValidate } from "./validate.js";
import * as api from "./api.js";

const TYPES = ['receita', 'despesa'];
const FIELDS = ['description', 'amount', 'type', 'category', 'date'];

const MESSAGES = [
    "Transação criada com sucesso!",
    "Transação atualizada com sucesso!"
];

// ================ ELEMENTS ================
const elements = {
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

    // Lista original usada pelos filtros
    transactions: []
};


// ================ FUNCTIONS ================
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
            emptyList();
        }
    } else {
        emptyList();
        if (response.message) showInform(response.message, false, true);
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