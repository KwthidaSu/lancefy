<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Lancefy - Set new password</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="${url.resourcesPath}/css/styles.css" />
</head>

<body class="lancefy-bg <#if message?has_content>has-message</#if>">

  <canvas id="fireflies"></canvas>

  <div class="login-wrapper">
    <div class="login-content">
      <div class="header">
        <h1 class="brand">Lancefy</h1>
        <p class="subtitle">Set your new password</p>
      </div>

      <#if message?has_content>
        <div class="login-error">
          ${message.summary}
        </div>
      </#if>

      <form class="login-form" action="${url.loginAction}" method="post">
        <div class="input-group">
          <label class="field-label" for="password-new">New password</label>
          <div class="password-field">
            <input
              type="password"
              id="password-new"
              name="password-new"
              placeholder="New password"
              autocomplete="new-password"
              required
              data-password-input
            />
            <button
              type="button"
              class="password-toggle"
              data-password-toggle
              aria-label="Show password"
              aria-pressed="false"
            >
              <svg class="password-toggle-icon password-toggle-show" aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M2 12C3.8 8.5 7.4 6 12 6C16.6 6 20.2 8.5 22 12C20.2 15.5 16.6 18 12 18C7.4 18 3.8 15.5 2 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/>
              </svg>
              <svg class="password-toggle-icon password-toggle-hide" aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M3 3L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                <path d="M10.6 6.2C11.06 6.07 11.53 6 12 6C16.6 6 20.2 8.5 22 12C21.14 13.67 19.91 15.12 18.39 16.23" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M6.25 7.52C4.48 8.63 3.05 10.18 2 12C3.8 15.5 7.4 18 12 18C13.84 18 15.52 17.6 16.98 16.88" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9.88 9.88C9.37 10.39 9.06 11.09 9.06 11.86C9.06 13.43 10.34 14.71 11.91 14.71C12.68 14.71 13.38 14.4 13.89 13.89" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="input-group">
          <label class="field-label" for="password-confirm">Confirm new password</label>
          <div class="password-field">
            <input
              type="password"
              id="password-confirm"
              name="password-confirm"
              placeholder="Confirm new password"
              autocomplete="new-password"
              required
              data-password-input
            />
            <button
              type="button"
              class="password-toggle"
              data-password-toggle
              aria-label="Show password"
              aria-pressed="false"
            >
              <svg class="password-toggle-icon password-toggle-show" aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M2 12C3.8 8.5 7.4 6 12 6C16.6 6 20.2 8.5 22 12C20.2 15.5 16.6 18 12 18C7.4 18 3.8 15.5 2 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/>
              </svg>
              <svg class="password-toggle-icon password-toggle-hide" aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M3 3L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                <path d="M10.6 6.2C11.06 6.07 11.53 6 12 6C16.6 6 20.2 8.5 22 12C21.14 13.67 19.91 15.12 18.39 16.23" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M6.25 7.52C4.48 8.63 3.05 10.18 2 12C3.8 15.5 7.4 18 12 18C13.84 18 15.52 17.6 16.98 16.88" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9.88 9.88C9.37 10.39 9.06 11.09 9.06 11.86C9.06 13.43 10.34 14.71 11.91 14.71C12.68 14.71 13.38 14.4 13.89 13.89" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <button type="submit" class="primary-btn">
          Update password
        </button>
      </form>

      <div class="footer">
        <span>Back to</span>
        <a href="${url.loginUrl}">Sign in</a>
      </div>
    </div>
  </div>

  <script src="${url.resourcesPath}/js/fireflies.js"></script>
  <script>
    document.querySelectorAll("[data-password-toggle]").forEach(function(toggle) {
      toggle.addEventListener("click", function() {
        var wrapper = toggle.closest(".password-field");
        var input = wrapper ? wrapper.querySelector("[data-password-input]") : null;
        if (!input) return;

        var isVisible = input.getAttribute("type") === "text";
        input.setAttribute("type", isVisible ? "password" : "text");
        toggle.setAttribute("aria-pressed", isVisible ? "false" : "true");
        toggle.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
      });
    });
  </script>
</body>
</html>
