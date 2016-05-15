function LoginCtrl() {
  var loginTemplateSource = $("#login-template").html();
  var loginTemplate = Handlebars.compile(loginTemplateSource);

  $("#main-view").html(loginTemplate);

  $("#login-form").on("submit", function(event) {
    event.preventDefault();

    haloAppRef.authWithPassword({
      "email": $("#loginEmail").val(),
      "password": $("#loginPassword").val()
    }, function(error, authData) {
      if (error) {
        console.log("Login Failed!", error);
      } else {
        console.log("Authenticated successfully with payload:", authData);
        router.setRoute("/search");
      }
    });
  });
}
