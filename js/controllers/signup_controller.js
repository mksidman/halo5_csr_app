function SignupCtrl() {
  var signupTemplateSource = $("#signup-template").html();
  var signupTemplate = Handlebars.compile(signupTemplateSource);

  $("#main-view").html(signupTemplate);

  $("#signup-form").on("submit", function(event) {
    event.preventDefault();

    haloAppRef.createUser({
      email: $("#signupEmail").val(),
      password: $("#signupPassword").val()
    }, function(error, userData) {
      if (error) {
        switch (error.code) {
          case "EMAIL_TAKEN":
            console.log("The new user account cannot be created because the email is already in use.");
            break;
          case "INVALID_EMAIL":
            console.log("The specified email is not a valid email.");
            break;
          default:
            console.log("Error creating user:", error);
          }
        } else {
          console.log("Successfully created user account with uid:", userData.uid);
          router.setRoute("/login");
        }
      });
    });
  }
