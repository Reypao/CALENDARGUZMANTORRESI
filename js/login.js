const form = document.getElementById("loginForm");
const errorMsg = document.getElementById("errorMsg");

// 👇 USUARIOS AUTORIZADOS
const users = {
    efrey: "8425",
    paola: "trillis"
};

form.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.toLowerCase();
    const password = document.getElementById("password").value;

    if (users[username] && users[username] === password) {

        // guardar sesión
        localStorage.setItem("user", username);

        // redirigir
        window.location.href = "index.html";

    } else {
        errorMsg.textContent = "Access denied";
    }
});
