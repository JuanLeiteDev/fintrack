import database

from flask import Flask, render_template, jsonify, request
from datetime import datetime
import math

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
    transaction = request.get_json(silent=True)
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
                "body": [{"form": "Erro ao inserir na base de dados."}]
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
    return jsonify({"sucesse": True, "body": transactions}), 200

@app.route('/api/transaction/<int:id>', methods=["GET"])
def read_one(id):
    transaction = database.get_transaction(id)
    if transaction:
        return jsonify({"sucesse": True, "body": transaction}), 200
    return jsonify({"sucesse": False, "id": id, "message": "Transação não encontrada."}), 404

@app.route('/api/transaction/<int:id>', methods=["PUT"])
def update(id):
    transaction = request.get_json(silent=True)
    errors, data = transaction_validate(transaction)
    if errors:
        response = {
            "sucesse": False,
            "body": [{key: value} for key, value in errors.items()]
        }
        return jsonify(response), 422

    updated_transaction = database.update_transaction(id, data)
    if updated_transaction:
        return jsonify({"sucesse": True, "body": updated_transaction}), 200
    return jsonify({"sucesse": False, "id": id, "message": "Transação não encontrada."}), 404

@app.route('/api/transaction/<int:id>', methods=["DELETE"])
def delete_transaction(id):
    if database.delete_transaction(id): return jsonify({"sucesse": True, "id": id}), 200
    else: return jsonify({"sucesse": False, "id": id, "message": "Transação não encontrada."}), 404


# ======================= FUNÇÕES AUXILIARES =======================

def transaction_validate(transaction: dict):
    errors = {}

    if not transaction: 
        errors["form"] = "Transação não pode ser nula."
        return errors, {}
    
    if not isinstance(transaction, dict):
        errors["form"] = "Transação passada por argumento não corresponde a um dict."
        return errors, {}
    
    description = transaction.get("description")
    if description is None:
        errors["description"] = "Descrição não pode ser nula."
    else:
        description = str(description).strip()
        if not description: errors["description"] = "Descrição não pode ser nula."
        elif len(description) > 50: errors["description"] = "Descrição não pode ter mais de 50 caracteres."

    amount = transaction.get("amount")
    if amount is None or str(amount).strip() == "":
        errors["amount"] = "Valor não pode ser nulo."
    else:
        try:
            amount = round(float(amount), 2)
            if not math.isfinite(amount) or amount <= 0:
                errors["amount"] = "Valor não pode ser menor ou igual a 0."
        except (TypeError, ValueError):
            errors["amount"] = "Valor inválido."

    type_field = transaction.get("type")
    if type_field is None:
        errors["type"] = "Tipo não pode ser nulo."
    else:
        type_field = str(type_field).strip().lower()
        if not type_field: errors["type"] = "Tipo não pode ser nulo."
        elif type_field not in TYPES: errors["type"] = "Tipo inválido."

    category = transaction.get("category")
    if category is None:
        errors["category"] = "Categoria não pode ser nula."
    else:
        category = str(category).strip()
        if not category: errors["category"] = "Categoria não pode ser nula."
        elif len(category) > 50: errors["category"] = "Categoria não pode ter mais de 50 caracteres."

    date = transaction.get("date")
    if date is None or str(date).strip() == "":
        errors["date"] = "Data não pode ser nula."
    else:
        try:
            date = str(date).strip()
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
