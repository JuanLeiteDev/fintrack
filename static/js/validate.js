const TYPES = ["receita", "despesa"];

export function formValidate(data){
    const errors = {};

    if(!data) {
        return { form: "A transação não pode ter campos nulos." };
    }

    if(!data.description || !data.description.trim()){
        errors["description"] = "Campo descrição não pode ser nulo.";
    } else if(data.description.trim().length > 50) {
        errors["description"] = "Campo descrição pode conter no máximo 50 caracteres.";
    }

    const amount = Number(data.amount);
    
    if(data.amount === null || data.amount.trim() === "") {
        errors["amount"] = "Campo valor não pode ser nulo.";
    } else if(Number.isNaN(amount)) {
        errors["amount"] = "Campo valor inválido.";
    } else if(amount <= 0) {
        errors["amount"] = "Campo valor tem que ser superior a 0.";
    }

    if(!data.type) {
        errors["type"] = "Campo tipo não pode ser nulo.";
    } else if(!TYPES.includes(data.type)) {
        errors["type"] = "Campo tipo inválido.";
    }

    if(!data.category || !data.category.trim()) {
        errors["category"] = "Campo categoria não pode ser nulo.";
    }

    if(!data.date || !data.date.trim()) {
        errors["date"] = "Campo data não pode ser nulo.";
    }

    if(Object.keys(errors).length > 0) return Object.entries(errors).map(([key, value]) => ({[key]: value}))
    else return null
}
