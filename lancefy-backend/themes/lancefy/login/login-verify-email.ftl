<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Email verification</title>
  <link rel="stylesheet" href="${url.resourcesPath}/css/styles.css">
</head>

<body class="lancefy-bg">

<div id="fireflies"></div>

<div class="login-wrapper">
  <div class="login-content">

    <div class="header">
      <h1 class="brand">Lancefy</h1>
      <p class="subtitle">Verify your email</p>
    </div>

    <div class="login-error" style="background: rgba(255, 190, 120, 0.14); color: #ffe7c2;">
      You need to verify your email address to activate your account.
    </div>

    <p style="
      margin-top: 18px;
      font-size: 14px;
      color: rgba(234, 241, 255, 0.74);
      text-align: center;
      line-height: 1.6;
    ">
      We've sent a verification email to<br>
      <strong>${user.email}</strong>
    </p>

    <form
      action="${url.loginAction}"
      method="post"
      style="margin-top: 26px; text-align: center;"
    >
      <button class="primary-btn" type="submit">
        Re-send verification email
      </button>
    </form>

    <div class="footer">
      Already verified?
      <a href="${url.loginUrl}">Sign in</a>
    </div>

  </div>
</div>

</body>
</html>
