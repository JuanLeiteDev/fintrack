import { formValidate } from "./validate.js";
import * as api from "./api.js";

const TYPES = ['receita', 'despesa'];
const FIELDS = ['description', 'amount', 'type', 'category', 'date']
const MESSAGES = [
    "Transação criada com sucesso!",
]

// ================ ELEMENTS ================
const elements = {
    form: document.querySelector('#transactionForm'),
    btnSubmit: document.querySelector('#submit-form'),
    description: document.querySelector('input#description'),
    amount: document.querySelector('input#amount'),
    type: document.querySelector('select#type'),
    category: document.querySelector('select#category'),
    date: document.querySelector('input#date'),
    transactionsList: document.querySelector('.transactions-list'),
    filter: document.querySelector('#filter'),
    inform: document.querySelector('#inform'),
    btnCancel: document.querySelector('#btn-cancel'),
    btnConfirm: document.querySelector('#btn-confirm'),
    currentTransaction: null,
    timer: null,
    countTransaction: 0
}

// ================ FUNCTIONS ================
function initTimeout(){
    clearTimeout(elements.timer)

    elements.timer = setTimeout(() => {
        elements.inform.classList.add('inform-ocult');
    }, 3000)
}

function cancelTimeout() {
    clearTimeout(elements.timer);
}

function showInform(msg, buttons=false, error=false){
    cancelTimeout()

    if(elements.inform.classList.contains('inform-ocult')){
        elements.inform.classList.remove('inform-ocult');
    }

    const msgElement = elements.inform.firstElementChild;
    const buttonsBox = elements.inform.querySelector("#confirm-box");
    if(msgElement) msgElement.innerText = msg;

    if(!buttons){
        const color = error ? "var(--danger)" : "var(--success)";
        elements.inform.style.borderColor = color
        msgElement.style.color = color
        buttonsBox.style.display = "none";
        initTimeout()
    } else {
        elements.inform.style.borderColor = "var(--danger)"
        msgElement.style.color = "var(--danger)"
        buttonsBox.style.display = "flex";
    }
}

function readForm(){
    return {
        description: elements.description.value,
        amount: elements.amount.value,
        type: elements.type.value,
        category: elements.category.value,
        date: elements.date.value,
    };
}

function escapeHtml(value){
    const element = document.createElement('span');
    element.textContent = String(value ?? "");
    return element.innerHTML;
}

function showErrors(errors){
    if(!Array.isArray(errors)){
        showInform("Erro ao tentar processar os dados.", false, true);
        return
    }

    for(const error of errors){
        const key = Object.keys(error)[0];
        const value = Object.values(error)[0];
        const field = elements[key];

        if(!field){
            showInform(value, false, true);
            continue
        }
        
        const nextElement = field.nextElementSibling;
        if(!nextElement || !nextElement.classList.contains('error')){
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

function formatTransaction(transaction){
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
    }
}

async function saveForm(event){
    event.preventDefault();

    const dataForm = readForm();
    const errors = formValidate(dataForm);

    if(errors){
        showErrors(errors);
    } else {
        const newData = await api.sendNewTransaction(dataForm);
        if(newData.sucesse){
            elements.form.reset();
            showInform(MESSAGES[0]);
            updateTransactions(formatTransaction(newData.body));
        } else {
            showErrors(newData.body ?? [{form: newData.message ?? "Erro ao salvar transação."}]);
        }
    }
}

async function showTransactions(){
    const response = await api.loadTransactions()
    if(response.sucesse){
        const transactions = response.body ?? []
        if(Array.isArray(transactions) && transactions.length > 0){
            transactions.forEach(transaction => {
                updateTransactions(formatTransaction(transaction))
            })
        } else {
            emptyList()
        }
    } else {
        emptyList()
        if(response.message) showInform(response.message, false, true)
    }
}

function updateTransactions(newTransaction){

    if(elements.countTransaction == 0) emptyList(false)

    const newArticle = document.createElement('article');
    newArticle.classList.add('transaction-item')
    newArticle.dataset.id = newTransaction.id
    const isIncome = newTransaction.type === TYPES[0]

    newArticle.innerHTML = 
    `
        <div class="transaction-info">
            <h3>${escapeHtml(newTransaction.description)}</h3>
            <p>${isIncome ? "Receita":"Despesa"} • ${escapeHtml(newTransaction.category)} • ${escapeHtml(newTransaction.date)}</p>
        </div>

        <div class="transaction-value ${isIncome ? "income":"expense"}">
            <strong>${isIncome ? "+":"-"} € ${escapeHtml(newTransaction.amount)}</strong>
        </div>

        <div class="transaction-actions">
            <button type="button" class="btn-secondary edit">Editar</button>
            <button type="button" class="btn-secondary delete">Apagar</button>
        </div>
    `

    elements.transactionsList.prepend(newArticle);

    elements.countTransaction++;
    const btnDelete = newArticle.querySelector('.delete');
    const btnEdit = newArticle.querySelector('.edit');

    btnDelete.addEventListener('click', () => {
        elements.currentTransaction = newArticle
        showInform("Deseja apagar essa transação?", true);
    });

    btnEdit.addEventListener('click', () => {
        showInform("Edição ainda não implementada.", false, true);
    });
}

function emptyList(empty=true){
    if(empty) elements.transactionsList.closest('#transactions').style.display = "none"
    else elements.transactionsList.closest('#transactions').style.display = "block"
}


// ================ EVENTS ================
elements.form.addEventListener("submit", saveForm);

FIELDS.forEach(field => {
    let btnInput = document.querySelector(`#${field}`)
    btnInput.addEventListener('input', () => {
        if(btnInput.classList.contains('input-error')){
            btnInput.classList.remove('input-error');
            if(btnInput.nextElementSibling?.classList.contains('error')){
                btnInput.nextElementSibling.remove()
            }
        }
    })
})

elements.btnCancel.addEventListener('click', () => {
    elements.inform.classList.add('inform-ocult');
    elements.currentTransaction = null;
})

elements.btnConfirm.addEventListener('click', async () => {
    if(elements.currentTransaction){
        const response = await api.deleteTransaction(elements.currentTransaction.dataset.id)
        if(response.sucesse){
            showInform("Transação apagada com sucesso!"); 
            elements.currentTransaction.remove();
            elements.currentTransaction = null;
            elements.countTransaction--;
            if(elements.countTransaction <= 0) emptyList()
        } else {
            showInform("Erro ao tentar apagar uma transação.", false, true);
        }
    } else {
        showInform("Nenhuma transação informada.", false, true)
    }
})

showTransactions()
