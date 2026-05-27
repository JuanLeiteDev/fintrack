import database

from flask import Flask, render_template, jsonify, request
from datetime import datetime

app = Flask(__name__)
database.init_db()

FIELDS = ('description', 'amount', 'type', 'category', 'date',)
TYPES = ('receita', 'despesa',)

# ======================= ROTAS CRUD =======================

@app.route('/', methods=["GET"])
def home():
    return render_template("index.html")

@app.route('/api/transaction', methods=["POST"])
def create():
    transaction = request.get_json()
    errors, data = transaction_validate(transaction)
    if not errors:
        new_transaction = database.create_transaction(data)
        if new_transaction:
            response = {
                "sucesse": True,
                "body": new_transaction
            }
            return jsonify(response), 201
        else:
            response = {
                "sucesse": False,
                "body": [{"database": "Erro ao inserir na base de dados."}]
            }
    else:
        response = {
            "sucesse": False,
            "body": [{key: value} for key, value in errors.items()]
        }

    return jsonify(response), 422

@app.route('/api/transaction', methods=["GET"])
def read_all():
    transactions = database.list_transactions()
    if not transactions: return jsonify({"sucesse": False, "message": "Não existe transações"}), 400
    else: return jsonify({"sucesse": True, "body": transactions}), 200

@app.route('/api/transaction/<int:id>', methods=["GET"])
def read_one(id):
    pass

@app.route('/api/transaction/<int:id>', methods=["PUT"])
def update(id):
    pass

@app.route('/api/transaction/<int:id>', methods=["DELETE"])
def delete_transaction(id):
    id = int(id)
    if database.delete_transaction(id): return jsonify({"sucesse": True, "id": id}), 200
    else: return jsonify({"sucesse": False, "id": id}), 400


# ======================= FUNÇÕES AUXILIARES =======================

def transaction_validate(transaction: dict):
    errors = {}

    if not transaction: 
        errors["outros"] = "Transação não pode ser nula."
        return errors, {}
    
    if not isinstance(transaction, dict):
        errors["outros"] = "Transação passada por argumento não corresponde a um dict."
        return errors, {}
    
    description = str(transaction.get("description", ""))
    if not description: errors["description"] = "Descrição não pode ser nula."
    elif len(description.strip()) > 50: errors["description"] = "Descrição não pode ter mais de 50 caracteres."
    else: description = description.strip()

    amount = str(transaction.get("amount", ""))
    if not amount: errors["amount"] = "Valor não pode ser nulo."
    else:
        try:
            amount = round(float(amount), 2)
            if amount <= 0: errors["amount"] = "Valor não pode ser menor ou igual a 0."
        except ValueError:
            errors["amount"] = "Valor inválido."

    type_field = str(transaction.get("type", ""))
    if not type_field: errors["type"] = "Tipo não pode ser nulo."
    elif type_field.strip().lower() not in TYPES: errors["type"] = "Tipo inválido."
    else: type_field = type_field.strip().lower()

    category = str(transaction.get("category", ""))
    if not category: errors["category"] = "Categoria não pode ser nula."
    elif len(category.strip()) > 50: errors["category"] = "Categoria não pode ter mais de 50 caracteres."
    else: category = category.strip()

    date = str(transaction.get("date", ""))
    if not date: errors["date"] = "Data não pode ser nula."
    else:
        try:
            date = datetime.strptime(date, "%Y-%m-%d").strftime("%Y-%m-%d")
        except ValueError:
            errors["date"] = "Formato da data está inválido."

    if errors:
        return errors, {}
    
    new_transaction = {
        "description": description,
        "amount": amount,
        "type": type_field,
        "category": category,
        "date": date
    }

    return {}, new_transaction


# ======================= INÍCIO DO PROGRAMA =======================

if __name__ == "__main__":
    app.run()