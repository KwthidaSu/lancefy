<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Create account</title>
  <link rel="stylesheet" href="${url.resourcesPath}/css/styles.css">
</head>

<body class="lancefy-bg <#if message??>has-message</#if>">

<div id="fireflies"></div>

<div class="login-wrapper">
  <div class="login-content">

    <div class="header">
      <h1 class="brand">Lancefy</h1>
      <p class="subtitle">Create your account</p>
    </div>

    <#if message??>
      <div class="login-error">
        ${message.summary}
      </div>
    </#if>

    <form class="login-form" action="${url.registrationAction}" method="post">

      <div class="input-group">
        <label class="field-label" for="firstName">First name</label>
        <input
          type="text"
          id="firstName"
          name="firstName"
          placeholder="First name"
          required
          value="${(register.formData.firstName!'')}"
        >
      </div>

      <div class="input-group">
        <label class="field-label" for="lastName">Last name</label>
        <input
          type="text"
          id="lastName"
          name="lastName"
          placeholder="Last name"
          required
          value="${(register.formData.lastName!'')}"
        >
      </div>

      <div class="input-group">
        <label class="field-label" for="username">Username</label>
        <input
          type="text"
          id="username"
          name="username"
          placeholder="Username"
          required
          value="${(register.formData.username!'')}"
        >
      </div>

      <div class="input-group">
        <label class="field-label" for="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="Email"
          required
          value="${(register.formData.email!'')}"
        >
      </div>

      <div class="input-group">
        <label class="field-label" for="password">Password</label>
        <div class="password-field">
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Password"
            required
            data-password-input
          >
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
        <label class="field-label" for="password-confirm">Confirm password</label>
        <div class="password-field">
          <input
            type="password"
            id="password-confirm"
            name="password-confirm"
            placeholder="Confirm password"
            required
            data-password-input
          >
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

      <button class="primary-btn" type="submit">
        Create account
      </button>

    </form>

    <#if social.providers?? && social.providers?size gt 0>
      <div class="social-login">
        <div class="social-divider">
          <span>Or continue with</span>
        </div>

        <div class="social-buttons">
          <#list social.providers as p>
            <a id="social-${p.alias}" class="social-btn social-btn-${p.alias}" href="${p.loginUrl}">
              <#if p.alias == "google">
                <svg class="social-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#EA4335" d="M12.24 10.285v3.964h5.51c-.242 1.272-.968 2.35-2.062 3.074l3.333 2.588c1.942-1.79 3.059-4.427 3.059-7.574 0-.724-.065-1.42-.185-2.102z"/>
                  <path fill="#4285F4" d="M12 22c2.7 0 4.964-.896 6.618-2.428l-3.333-2.588c-.926.621-2.112.99-3.285.99-2.525 0-4.664-1.705-5.43-3.995H3.124v2.67A9.998 9.998 0 0 0 12 22"/>
                  <path fill="#FBBC05" d="M6.57 13.979A5.994 5.994 0 0 1 6.266 12c0-.688.118-1.357.304-1.979V7.351H3.124A9.998 9.998 0 0 0 2 12c0 1.61.385 3.135 1.124 4.649z"/>
                  <path fill="#34A853" d="M12 6.026c1.468 0 2.786.505 3.823 1.494l2.867-2.867C16.959 3.042 14.695 2 12 2A9.998 9.998 0 0 0 3.124 7.351l3.446 2.67C7.336 7.731 9.475 6.026 12 6.026"/>
                </svg>
              </#if>
              <span>${p.displayName!p.alias?cap_first}</span>
            </a>
          </#list>
        </div>
      </div>
    </#if>

    <div class="footer">
      Already have an account?
      <a href="${url.loginUrl}">Sign in</a>
    </div>

  </div>
</div>

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
