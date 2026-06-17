<!DOCTYPE html>
<html>
<body style="
  margin:0;
  padding:0;
  font-family: system-ui, -apple-system, Segoe UI, sans-serif;
  background:#ffffff;
">

<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding:48px 16px;">

      <table width="480" cellpadding="0" cellspacing="0" style="
        background:#061817;
        padding:56px 48px 60px;
        color:#cbeffb;
      ">

        <tr>
          <td style="
            font-size:26px;
            font-weight:500;
            letter-spacing:0.06em;
            padding-bottom:24px;
          ">
            Lancefy
          </td>
        </tr>

        <tr>
          <td style="
            font-size:18px;
            font-weight:500;
            padding-bottom:28px;
            color:#eafffc;
          ">
            Verify your email
          </td>
        </tr>

        <tr>
          <td style="
            font-size:14.5px;
            line-height:1.8;
            color:rgba(203,239,235,0.8);
            padding-bottom:40px;
          ">
            Hi ${user.firstName!""},<br><br>
            Please confirm your email address to activate your account.
            This helps us keep your workspace secure.
          </td>
        </tr>

        <tr>
          <td style="padding-bottom:48px;">
            <a href="${link}" style="
              display:inline-block;
              padding:14px 34px;
              background:#48a89a;
              color:#053931;
              font-size:14px;
              font-weight:500;
              text-decoration:none;
            ">
              Verify email
            </a>
          </td>
        </tr>

        <tr>
          <td style="
            font-size:12.5px;
            color:rgba(203,239,235,0.45);
            line-height:1.7;
          ">
            If you didn’t create this account, you can safely ignore this email.
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>
