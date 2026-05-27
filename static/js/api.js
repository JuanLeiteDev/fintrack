const API_BASE = '/api';
const HEADER = {"Content-type": "application/json"}

async function parseResponse(response){
    let data;

    try {
        data = await response.json()
    } catch {
        data = {sucesse: false, message: "Resposta inválida do servidor."}
    }

    if(!response.ok){
        data.sucesse = false;
    }

    return data;
}

export async function loadTransactions() {
    try {
        const response = await fetch(`${API_BASE}/transaction`, {
            method: "GET",
            headers: HEADER
        });

        return await parseResponse(response)
    } catch {
        return {sucesse: false, body: [], message: "Erro de conexão com o servidor."}
    }
}

export async function sendNewTransaction(data){
    try {
        const response = await fetch(`${API_BASE}/transaction`, {
            method: "POST",
            headers: HEADER,
            body: JSON.stringify(data)
            }
        );

        return await parseResponse(response);
    } catch {
        return {sucesse: false, body: [{form: "Erro de conexão com o servidor."}]}
    }
}

export async function deleteTransaction(id) {
    try {
        const response = await fetch(`${API_BASE}/transaction/${id}`, {
            method: "DELETE",
            headers: HEADER
        })

        return await parseResponse(response)
    } catch {
        return {sucesse: false, message: "Erro de conexão com o servidor."}
    }
}
