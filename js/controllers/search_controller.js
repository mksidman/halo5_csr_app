function SearchCtrl() {

  var playerDataObjectArray = [];
  var finalRanking;
  var finalUserRanking;

  var searchTemplateSource = $("#search-template").html();
  var searchTemplate = Handlebars.compile(searchTemplateSource);

  $("#main-view").html(searchTemplate);

  //Check if user is authed and populate login field
  authenticated = haloAppRef.getAuth();

  if(authenticated) {
    var userEmail = authenticated.password.email;
    var userName = userEmail.match(/[^@]+/);

    $("#userAuthStatus").html("Logged in as " + userName + " " + "<button id='logout-button' type='button' class='btn btn-warning btn-sm'>Logout</button>");

    //create new firebase instance for user to save players to
    authUserRef = new Firebase("https://halo5-csr-app.firebaseio.com/" + userName);

    $(document).on("click", "#logout-button", function() {
      haloAppRef.unauth();
      router.setRoute("/login");
    });
  } else {
    $("#userAuthStatus").html("Not logged in");
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
      url: "http://localhost:3000/stats/h5/servicerecords/arena?players=" + gamerTagInput,
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
          url: "http://localhost:3000/profile/h5/profiles/" + gamerTag + "/spartan",
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
      url: "http://localhost:3000/stats/h5/players/" + gamerTagInput + "/matches",
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
            url: "http://localhost:3000/stats/h5/arena/matches/" + matchId,
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
                url: "http://localhost:3000/stats/h5/servicerecords/arena?players=" + gamerTagString,
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
                      url: "http://localhost:3000/profile/h5/profiles/" + gamerTag + "/spartan",
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

  //loop through search results and find matching gamerTag in data-tag attr; push relevant object to firebase
  $(document).on("click", ".save-player-button", function() {
    console.log(playerDataObjectArray);

    if (authenticated) {
      var gamerTag = $(this).attr("data-tag");

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
        }
      }
    } else {
      alert("Please login before saving a gamer");
    }



  });

}
