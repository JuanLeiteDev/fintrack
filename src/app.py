import database

from flask import Flask, render_template, jsonify


app = Flask(__name__)
database.init_db()

if __name__ == "__main__":
    app.run()