function SavedCtrl() {

  if(authenticated) {
    var savedTemplateSource = $("#saved-template").html();
    var savedTemplate = Handlebars.compile(savedTemplateSource);

    var userEmail = authenticated.password.email;
    var userName = userEmail.match(/[^@]+/);

    $("#userAuthStatus").html("Logged in as " + userName + " " + "<button id='logout-button' type='button' class='btn btn-warning btn-sm'>Logout</button>");

    //create new firebase instance for user to save players to
    var authUserRef = new Firebase("https://halo5-csr-app.firebaseio.com/" + userName);

    //allow for logout on-click of button
    $(document).on("click", "#logout-button", function() {
      haloAppRef.unauth();
      router.setRoute("/login");
    });

    //display list of saved gamers
    //TODO: figure out how to pull identifier from firebase for delete command and put in template

    authUserRef.on("value", function(results) {
      var gamers = results.val();
      console.log(gamers);

      //gamers is reuslt object; gamer is each iterator in HTMl
      $("#main-view").html(savedTemplate({
        gamer: gamers
      }));
    });

    //remove player from saved list
    $(document).on("click", ".remove-player-button", function() {

    });


  } else {
    alert("Please login to access saved gamers");
    router.setRoute("/login");
  }

}
