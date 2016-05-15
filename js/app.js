var router;
var haloAppRef = new Firebase("https://halo5-csr-app.firebaseio.com/");
var authenticated;
var authUserRef;
var userEmail;
var userName;

$(document).ready(function() {

  router = Router({
    "/search": SearchCtrl,
    "/login": LoginCtrl,
    "/signup": SignupCtrl,
    "/saved": SavedCtrl
  }).init("/search");

  //on click, add class of "active" to parent <li>
  $(".nav a").on("click", function(){
    $(".nav").find(".active").removeClass("active");
    $(this).parent().addClass("active");
  });


  function LoginCtrl() {

    $(".nav").find(".active").removeClass("active");
    $("#loginLink").addClass("active");

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



  function SignupCtrl() {

    $(".nav").find(".active").removeClass("active");
    $("#signupLink").addClass("active");

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




  function SearchCtrl() {

    $(".nav").find(".active").removeClass("active");
    $("#searchLink").addClass("active");

    var finalRanking;
    var finalUserRanking;
    var playerDataObjectArray = [];

    var searchTemplateSource = $("#search-template").html();
    var searchTemplate = Handlebars.compile(searchTemplateSource);

    $("#main-view").html(searchTemplate);

    //Check if user is authed and populate login field
    authenticated = haloAppRef.getAuth();

    if(authenticated) {
      userEmail = authenticated.password.email;
      userName = userEmail.match(/[^@]+/);

      $("#loginState").html("Logged in as " + userName + " " + "<button id='logout-button' type='button' class='btn btn-warning btn-sm navbar-btn'>Logout</button>");

      //create new firebase instance for user to save players to
      authUserRef = new Firebase("https://halo5-csr-app.firebaseio.com/" + userName);

      $(document).on("click", "#logout-button", function() {
        haloAppRef.unauth();
        $("#loginState").html("<span class='navbar-text'>Logged Out</span>");
        router.setRoute("/login");
      });
    } else {
      $("#loginState").html("<span class='navbar-text'>Logged Out</span>");
    }

    //upon search, generate player info box and search results
    var subKey = "715bcb9a42444e63a73ea5ab978bd83c";

    $("#player-search-form").on("submit", function(event) {
      event.preventDefault();

      var gamerTagInput = $("#player-name").val();


      //retrieve player info for current user and display
      var ownPlayerTemplateSource = $("#own-player-template").html();
      var ownPlayerTemplate = Handlebars.compile(ownPlayerTemplateSource);

      $.ajax({
        type: "GET",
        url: "http://halo5-api-relay.herokuapp.com/stats/h5/servicerecords/arena?players=" + gamerTagInput,
        headers: {
          "Ocp-Apim-Subscription-Key": subKey
        },
        success: function(playerServiceRecord) {
          // console.log(playerServiceRecord);

          var playerCsr = playerServiceRecord.Results[0].Result.ArenaStats.HighestCsrAttained.Csr;
          var gamerTag = playerServiceRecord.Results[0].Id;
          // var finalUserRanking;
          var designationId;
          var designation;
          var playerTier;
          var spartanImage;

          if (playerCsr !== 0) {
            finalUserRanking = playerCsr;
          } else {
            designationId = playerServiceRecord.Results[0].Result.ArenaStats.HighestCsrAttained.DesignationId;

            switch(designationId) {
              case 0:
                designation = "Unranked";
                break;
              case 1:
                designation = "Bronze";
                break;
              case 2:
                designation = "Silver";
                break;
              case 3:
                designation = "Gold";
                break;
              case 4:
                designation = "Platinum";
                break;
              case 5:
                designation = "Diamond";
                break;
            }

            if (designation != "Unranked") {
              playerTier = playerServiceRecord.Results[0].Result.ArenaStats.HighestCsrAttained.Tier;
              finalUserRanking = designation + " " + playerTier;
            }
          }

          //grab player image
          $.ajax({
            type: "GET",
            url: "http://halo5-api-relay.herokuapp.com/profile/h5/profiles/" + gamerTag + "/spartan",
            headers: {
              "Ocp-Apim-Subscription-Key": subKey
            },
            success: function(spartanImageObject) {
              spartanImage = spartanImageObject.playerImage;

              //construct spartan player object
              var playerDataObject = {
                spartanImage: spartanImage,
                gamerTag: gamerTag,
                csr: finalUserRanking,
                totalKills: playerServiceRecord.Results[0].Result.ArenaStats.TotalKills,
                totalWon: playerServiceRecord.Results[0].Result.ArenaStats.TotalGamesWon,
                totalLost: playerServiceRecord.Results[0].Result.ArenaStats.TotalGamesLost,
                winPercentage: Math.round((playerServiceRecord.Results[0].Result.ArenaStats.TotalGamesWon/playerServiceRecord.Results[0].Result.ArenaStats.TotalGamesCompleted)*100) + "%"
              };

              $("#search-results-container").append(ownPlayerTemplate(playerDataObject));
            },
            error: function() {
              console.log("Problem returning player image");
            },
          });
        },
        error: function() {
          console.log("The Halo 5 API could not find your gamertag. This could also mean the API is down or experiencing issues.");
        }
      });


      //BEGIN SEARCH RESULTS LOGIC>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

      //retrieve stats for last match from inputted gamer
      $.ajax({
        type: "GET",
        url: "http://halo5-api-relay.herokuapp.com/stats/h5/players/" + gamerTagInput + "/matches",
        headers: {
            "Ocp-Apim-Subscription-Key": subKey
        },
        success: function(matches) {

          //save matchIds in an array for retrieval
          var matchIdArray = [];
          matches.Results.forEach(function(match) {
            matchIdArray.push(match.Id.MatchId);
          });

          //For each matchId, return other players from that match
          matchIdArray.forEach(function(matchId) {
            $.ajax({
              type: "GET",
              url: "http://halo5-api-relay.herokuapp.com/stats/h5/arena/matches/" + matchId,
              headers: {
                "Ocp-Apim-Subscription-Key": subKey
              },
              success: function(gameStats) {

                //save gamerTags from match in an array if != inputted gamerTag
                var gamerTagArray = [];
                gameStats.PlayerStats.forEach(function(playerObj) {
                  if (playerObj.Player.Gamertag != gamerTagInput) {
                    gamerTagArray.push(playerObj.Player.Gamertag);
                  }
                });

                //For each gamerTag, retrieve arena halo service record
                var gamerTagString = gamerTagArray.join();

                $.ajax({
                  type: "GET",
                  url: "http://halo5-api-relay.herokuapp.com/stats/h5/servicerecords/arena?players=" + gamerTagString,
                  headers: {
                    "Ocp-Apim-Subscription-Key": subKey
                  },
                  success: function(serviceRecords) {
                    // console.log(serviceRecords);

                    var playerTemplateSource = $("#player-template").html();
                    var playerTemplate = Handlebars.compile(playerTemplateSource);

                    serviceRecords.Results.forEach(function(playerServiceRecord) {

                      //define variables outside ajax requests for access later
                      var playerCsr = playerServiceRecord.Result.ArenaStats.HighestCsrAttained.Csr;
                      var gamerTag = playerServiceRecord.Id;
                      // var finalRanking;
                      var designationId;
                      var designation;
                      var playerTier;
                      var spartanImage;

                      //if CSR is zero, look up designation and tier
                      if (playerCsr !== 0) {
                        finalRanking = playerCsr;
                      } else {
                        designationId = playerServiceRecord.Result.ArenaStats.HighestCsrAttained.DesignationId;

                        switch(designationId) {
                          case 0:
                            designation = "Unranked";
                            break;
                          case 1:
                            designation = "Bronze";
                            break;
                          case 2:
                            designation = "Silver";
                            break;
                          case 3:
                            designation = "Gold";
                            break;
                          case 4:
                            designation = "Platinum";
                            break;
                          case 5:
                            designation = "Diamond";
                            break;
                        }

                        if (designation != "Unranked") {
                          playerTier = playerServiceRecord.Result.ArenaStats.HighestCsrAttained.Tier;
                          finalRanking = designation + " " + playerTier;
                        }
                      }


                      //TODO - CREATE LOGIC TO COMPARE RANKING WITH USER'S TO RETURN ONLY THOSE THAT ARE SAME SKILL LEVEL
                      //LOGIC: if number, compare integers; if string, find way to compare string type (leave our tiers?)
                      //should only proceed to next step if within range of ranking


                      //grab player image
                      $.ajax({
                        type: "GET",
                        url: "http://halo5-api-relay.herokuapp.com/profile/h5/profiles/" + gamerTag + "/spartan",
                        headers: {
                          "Ocp-Apim-Subscription-Key": subKey
                        },
                        success: function(spartanImageObject) {
                          spartanImage = spartanImageObject.playerImage;

                          //construct spartan player object
                          var playerDataObject = {
                            spartanImage: spartanImage,
                            gamerTag: gamerTag,
                            csr: finalRanking,
                            totalKills: playerServiceRecord.Result.ArenaStats.TotalKills,
                            totalWon: playerServiceRecord.Result.ArenaStats.TotalGamesWon,
                            totalLost: playerServiceRecord.Result.ArenaStats.TotalGamesLost,
                            winPercentage: Math.round((playerServiceRecord.Result.ArenaStats.TotalGamesWon/playerServiceRecord.Result.ArenaStats.TotalGamesCompleted)*100) + "%"
                          };

                          //push player objects to array to allow for future saving
                          playerDataObjectArray.push(playerDataObject);

                          $("#search-results-container").append(playerTemplate(playerDataObject));
                        },
                        error: function() {
                          console.log("Problem returning player image");
                        },
                      });

                    });
                  },
                  error: function() {
                    console.log("Service record retrieval error.");
                  }
                });
              },
              error: function() {
                console.log("Match stats retrieval failure.");
              }
            });
          });
        },
        error: function() {
          console.log("Match retrieval failure.");
        }
      });

    });
    //end of on-submit code for search functionality

    //remove any existing listener to prevent duplication
    $(document).off("click", ".save-player-button");

    //loop through search results and find matching gamerTag in data-tag attr; push relevant object to firebase
    $(document).on("click", ".save-player-button", function() {
      if (authenticated) {
        var gamerTag = $(this).attr("data-tag");
        console.log(gamerTag);
        console.log(playerDataObjectArray);

        for (var i = 0; i < playerDataObjectArray.length; i++) {

          if (playerDataObjectArray[i].gamerTag === gamerTag) {
            authUserRef.push({
              "gamerTag": playerDataObjectArray[i].gamerTag,
              "csr": playerDataObjectArray[i].csr,
              "totalKills": playerDataObjectArray[i].totalKills,
              "totalWon": playerDataObjectArray[i].totalWon,
              "totalLost": playerDataObjectArray[i].totalLost,
              "winPercentage": playerDataObjectArray[i].winPercentage,
              "spartanImage": playerDataObjectArray[i].spartanImage
            });

            $(this).parents(".player-container").hide();
            alert("Saved player successfully!");

          } else {
            console.log("No match");
          }
        }
      } else {
        alert("Please login before saving a gamer");
      }
    });
  }





  function SavedCtrl() {

    $(".nav").find(".active").removeClass("active");
    $("#savedLink").addClass("active");

    var savedTemplateSource = $("#saved-template").html();
    var savedTemplate = Handlebars.compile(savedTemplateSource);

    authenticated = haloAppRef.getAuth();

    if(authenticated) {
      userEmail = authenticated.password.email;
      userName = userEmail.match(/[^@]+/);

      $("#loginState").html("Logged in as " + userName + " " + "<button id='logout-button' type='button' class='btn btn-warning btn-sm navbar-btn'>Logout</button>");

      //create new firebase instance for user to save players to
      authUserRef = new Firebase("https://halo5-csr-app.firebaseio.com/" + userName);

      $(document).on("click", "#logout-button", function() {
        haloAppRef.unauth();
        $("#loginState").html("<span class='navbar-text'>Logged Out</span>");
        router.setRoute("/login");
      });

      authUserRef.once("value", function(results) {
        var gamers = results.val();
        console.log(gamers);

        if (gamers !== null) {
          $("#main-view").html(savedTemplate({
            gamer: gamers
          }));
        } else {
          $("#main-view").html("<p><div class='alert alert-danger' role='alert'>No saved gamers found.</div></p>");
        }
      });


      //remove player from saved list; .off method prevents duplication
      $(document).off("click", ".remove-player-button");
      $(document).on("click", ".remove-player-button", function() {
        var gamerId = $(this).attr("data-tag");
        console.log(gamerId);

        var gamerToRemove = new Firebase("https://halo5-csr-app.firebaseio.com/" + userName + "/" + gamerId);


        var onComplete = function(error) {
          if (error) {
            console.log('Deletion failed');
          } else {
            alert('Successfully removed player');

            authUserRef.once("value", function(results) {
              var gamers = results.val();
              console.log(gamers);

              if (gamers !== null) {
                $("#main-view").html(savedTemplate({
                  gamer: gamers
                }));
              } else {
                $("#main-view").html("<div class='alert alert-danger' role='alert'>No saved gamers found.</div>");
              }
            });
          }
        };

        gamerToRemove.remove(onComplete);

      });


    } else {
      alert("Please login to access saved gamers");
      router.setRoute("/login");
    }

  }




});
