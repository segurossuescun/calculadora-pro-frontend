from flask import Flask, jsonify

app = Flask(__name__)

@app.get("/health")
def health():
    return jsonify(
        status="ok",
        message="Calculadora Pro API running 💜"
    )

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
