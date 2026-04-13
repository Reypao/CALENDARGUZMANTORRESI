const form = document.getElementById("loginForm");
const errorMsg = document.getElementById("errorMsg");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const users = {
  efrey: "8425",
  paola: "trillis"
};

if (form && errorMsg && usernameInput && passwordInput) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (users[username] && users[username] === password) {
      localStorage.setItem("user", username);
      window.location.href = "index.html";
    } else {
      errorMsg.textContent = "Access denied";
    }
  });

  usernameInput.addEventListener("input", () => {
    errorMsg.textContent = "";
  });

  passwordInput.addEventListener("input", () => {
    errorMsg.textContent = "";
  });
}
