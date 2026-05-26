import { form_validate } from "./validate.js";

const TYPES = ['receita', 'despesa'];
const FIELDS = ['description', 'amount', 'type', 'category', 'date']

// ================ ELEMENTS ================
const elements = {
    form: document.querySelector('#transactionForm'),
    btnSubmit: document.querySelector('#submit-form'),
    description: document.querySelector('input#description'),
    amount: document.querySelector('input#amount'),
    type: document.querySelector('select#type'),
    category: document.querySelector('select#category'),
    date: document.querySelector('input#date'),
    transaction_edit: document.querySelector('.transaction-actions#edit'),
    transaction_del: document.querySelector('.transaction-actions#delete'),
    filter: document.querySelector('.section-actions#filter')
}

// ================ FUNCTIONS ================
function read_form(){
    return {
        description: elements.description.value,
        amount: elements.amount.value,
        type: elements.type.value,
        category: elements.category.value,
        date: elements.date.value,
    };
}

function save_form(event){
    const data_form = read_form();
    const errors = form_validate(data_form);

    if(errors){
        event.preventDefault();
        for(let error in errors){
            const nextElement = elements[error].nextElementSibling
            if(!nextElement){
                const newElement = document.createElement('p');
                newElement.classList.add('error');
                newElement.innerText = errors[error]
                elements[error].after(newElement);
            }
            elements[error].classList.add('input-error');
        }
    } else {
        alert("ok")
    }
}

// ================ EVENTS ================
elements.form.addEventListener("submit", save_form);

FIELDS.forEach(field => {
    let btnInput = document.querySelector(`#${field}`)
    btnInput.addEventListener('input', () => {
        if(btnInput.classList.contains('input-error')){
            btnInput.classList.remove('input-error');
            btnInput.nextElementSibling.remove()
        }
    })
})