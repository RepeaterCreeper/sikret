let usersSearched = localStorage.getItem("usersSearched");

// Your web app's Firebase configuration
let firebaseConfig = {
    apiKey: "AIzaSyAi8ZfnZStOpZQVUFy3tqpgrn7SOGDm1Vw",
    authDomain: "sikret-5fac5.firebaseapp.com",
    databaseURL: "https://sikret-5fac5.firebaseio.com",
    projectId: "sikret-5fac5",
    storageBucket: "sikret-5fac5.appspot.com",
    messagingSenderId: "807009708293",
    appId: "1:807009708293:web:3ef3e05a5f3bd5532c2f6c",
    measurementId: "G-92TZH7J3RF"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

let db = firebase.firestore();

const isUserCached = (uid) => {
    let usersSearched = JSON.parse(localStorage.getItem("usersSearched"));

    if (usersSearched[uid]) {
        return usersSearched[uid];
    }

    return false;
}
const isSignedIn = () => {
    if (localStorage.getItem("uid")) {
        return true;
    }

    return false;
}

const isMessaging = () => {
    let curUrl = new URL(window.location.href);

    if (curUrl.searchParams.get("code")) return true;

    return false;
}

const cacheUser = (uid, displayName) => {
    let usersSearched = JSON.parse(localStorage.getItem("usersSearched"));

    usersSearched[uid] = displayName;

    localStorage.setItem("usersSearched", JSON.stringify(usersSearched));
}

const getParams = (paramName) => {
    let curUrl = new URL(window.location.href);

    if (curUrl.searchParams.get(paramName)) {
        return curUrl.searchParams.get(paramName);
    } else {
        return -1;
    }
}

const convertDate = (seconds) => {
    let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let date = new Date(seconds * 1000);

    let month = months[date.getMonth()],
        day = date.getDate(),
        year = date.getFullYear();

    return `${month} ${day}, ${year}`;
}

const generateShareLink = () => {
    return `https://sikret-5fac5.firebaseapp.com?code=${localStorage.getItem("uid")}`;
}

const copyShareLink = (el) => {
    $("#shareLinkID").removeAttr("disabled");

    document.querySelector("#shareLinkID").focus();
    document.querySelector("#shareLinkID").setSelectionRange(0, 999);

    document.execCommand("copy");
    $("#shareLinkID").attr("disabled", "disabled");

    $(el).find(".btn-inner--text").text("COPIED");

    setTimeout(function() {
        $(el).find(".btn-inner--text").text("Copy Link");
    }, 1000);
}

function init() {
    if (!localStorage.getItem("usersSearched")) localStorage.setItem("usersSearched", "{}");

    if (isMessaging() && isSignedIn()) {
        showMessage();
    } else if (isSignedIn()) {
        $("#shareLinkID").val(generateShareLink());
        showDashboard();
    } else if (!isSignedIn() && getParams("code").length > 0){
        Swal.fire({
            title: 'Unauthorized Access',
            text: `You are trying to access share message page without being logged in! Please login in and try again.`,
            icon: 'error'
        })
        showLogin();
    } else {
        showLogin();
    }
}

function gotoProfile() {
    window.location.href = "/";
}

function showMessage(){
    $(".loginPhase").attr("hidden", true);
    $(".messagePhase").attr("hidden", false);
    $(".normalPhase").attr("hidden", true);

    let code = getParams("code");
    
    // Loading since we have to wait for the value to be retrieved from the database.
    if (!isUserCached(code)) {
        db.collection("users").where("uid", "==", code).get().then((querySnapshot) => {
            if (querySnapshot.docs.length > 0) {
                let data = querySnapshot.docs[0].data();

                cacheUser(code, data.displayName);
                $("*[data-information-id='receiverDN']").text(data.displayName);
                $("*[data-loading-id='displayNameMessages']").attr("hidden", true);
            } else {
                Swal.fire({
                    title: 'Invalid Code',
                    text: `The link you tried to access is using an invalid link! Redirecting...`,
                    icon: 'error',
                    onClose: function(){
                        gotoProfile();
                    }
                })
            }
        }).catch((err) => {
            if (err) throw err;
        });
    } else {
        $("*[data-information-id='receiverDN']").text(isUserCached(code));
        $("*[data-loading-id='displayNameMessages']").attr("hidden", true);
    }
}

/**
 * Shows the Dashboard
 */
function showDashboard() {
    $(".loginPhase").attr("hidden", true);
    $(".messagePhase").attr("hidden", true);
    $(".normalPhase").attr("hidden", false);

    $("*[data-information-id='displayName']").text(localStorage.getItem("displayName"));
    getAllMessages();
}

/**
 * Shows the login.
 */
function showLogin() {
    $(".loginPhase").attr("hidden", false);
    $(".messagePhase").attr("hidden", true);
    $(".normalPhase").attr("hidden", true);
}


/**
 * Sign in with Google Function
 */
function signInGoogle() {
    let provider = new firebase.auth.GoogleAuthProvider();

    firebase.auth().signInWithPopup(provider).then(function(result) {
        let user = result.user;

        createUser(user);
    });
}

/**
 * Sign in with Facebook Function
 */
function signInFacebook() {
    let provider = new firebase.auth.FacebookAuthProvider();

    firebase.auth().signInWithPopup(provider).then(function(result) {
        let user = result.user;

        createUser(user);
    });
}

/**
 * Creating of documents when the authentication of Google or Facebook goes through.
 * @param user
 */

function createUser(user) {
    let userDoc = db.collection("users").doc(user.uid);

    userDoc.get().then((docSnapshot) => {
        if (!docSnapshot.exists) {
            userDoc.set({
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                lastMessageSent: firebase.firestore.Timestamp.fromDate(new Date(0))
            }).then(() => {
                localStorage.setItem("uid", user.uid);
                localStorage.setItem("displayName", user.displayName);

                window.location.reload();
            }).catch((err) => {
                if (err) throw err;
            });
        } else {
            localStorage.setItem("uid", user.uid);
            localStorage.setItem("displayName", user.displayName);

            window.location.reload();
        }
    })
}

function getAllMessages() {
    // Inbox
    db.collection("messages").where("receiverId", "==", localStorage.getItem("uid")).get().then(function(querySnapshot){
        querySnapshot.forEach(function(doc) {
            let data = doc.data();

            let dateFormatted = convertDate(data.created.seconds);

            $("*[data-container-id='messages']").append(`<div class="col-lg-4" style="margin-top: 32px;"><div class="card"><div class="card-header bg-transparent pb-5">${data.content}</div><div class="card-footer text-right"><small>${dateFormatted}</small></div></div></div>`);
        });

        $(`*[data-loading-id='messages']`).attr("hidden", "hidden");
    });

    // Outbox
    db.collection("messages").where("authorId", "==", localStorage.getItem("uid")).get().then(function(querySnapshot){
        querySnapshot.forEach(function(doc){
            let data = doc.data();

            let dateFormatted = convertDate(data.created.seconds);

            $("*[data-container-id='sentMessages']").append(`<div class="col-lg-4" style="margin-top: 32px;"><div class="card"><div class="card-header bg-transparent pb-5">${data.content}</div><div class="card-footer text-right"><small>Sent to <strong>${data.receiverName}</strong> on ${dateFormatted}</small></div></div></div>`);
        })

        $(`*[data-loading-id='sentMessages']`).attr("hidden", "hidden");
    })
}

function sendMessage() {
    let curUrl = new URL(window.location.href),
        receiverId = null,
        content = $("#messageContent").val();

    if (curUrl.searchParams.get("code")) {
        receiverId = curUrl.searchParams.get("code");

        db.collection("messages").add({
            receiverId: receiverId,
            receiverName: isUserCached(receiverId),
            authorId: localStorage.getItem("uid"),
            content: content,
            created: firebase.firestore.FieldValue.serverTimestamp()
        }).then((doc) => {
            db.collection("users").doc(localStorage.getItem("uid")).update({
                lastMessageSent: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                Swal.fire({
                    title: 'Message Sent',
                    text: `You have been successfully sent an anonymous message! Press OK to go back to main page.`,
                    icon: 'success',
                    onClose: function() {
                        window.location.href = "/"; // Redirect to main page.
                    }
                });
            })
            .catch((err) => {
                if (err) throw err;
            });
        }).catch((err) => {
            if (getParams("code") == localStorage.getItem("uid")) {
                Swal.fire({
                    title: 'Error',
                    text: `You can not send message to yourself! You shouldn't even be in this PAGE!`,
                    icon: 'error',
                    onClose: function() {
                        window.location.href = "/"; // Redirect to main page.
                    }
                });
            } else if (content.length == 0){
                Swal.fire({
                    title: 'Error',
                    text: `Your message cannot be empty!`,
                    icon: 'error'
                });
            } else {
                Swal.fire({
                    title: 'Error',
                    text: `You can only send messages every 30 seconds.`,
                    icon: 'error'
                });
            }

            if (err) throw err;
        })
    }
}

function signOut() {
    firebase.auth().signOut().then(() => {
        showLogin();

        localStorage.clear();

        Swal.fire({
            title: 'Logged Out',
            text: 'You have been successfully logged out!',
            icon: 'success'
        });

    }).catch((err) => {
        if (err) throw err;
    })
}
