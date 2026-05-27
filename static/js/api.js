const API_BASE = '/api';
const HEADER = {"Content-type": "application/json"}

export async function loadTransactions() {
    const response = await fetch(`${API_BASE}/transaction`, {
        method: "GET",
        headers: HEADER
    });

    return await response.json()
}

export async function sendNewTransaction(data){
    const response = await fetch(`${API_BASE}/transaction`, {
        method: "POST",
        headers: HEADER,
        body: JSON.stringify(data)
        }
    );

    return await response.json();
}

export async function deleteTransaction(id) {
    const response = await fetch(`${API_BASE}/transaction/${id}`, {
        method: "DELETE",
        headers: HEADER
    })

    return await response.json()
}
