const socket = io();

function SaveGamerSession() 
{
  var nickname = document.getElementById("input").value;
  const errorElement = document.getElementById("error-input");

  if (InputValidityData(nickname)) 
  {
    sessionStorage.setItem("in_session", "true");
    window.location.href = "/game";
  }
  else
    errorElement.innerHTML = "Invalid input data";
}

function InputValidityData(nick) 
{
  var regex = /^[A-Za-z0-9]{1,15}$/;
  return regex.test(nick);
}

// == Chat container. ==
function toggleChat() 
{
  var chatBox = document.getElementById("chat-box");
  chatBox.style.display = chatBox.style.display === "none" ? "block" : "none";
}

function sendMessage() 
{
    var nickname = document.getElementById("input").value;

    var message_input = document.getElementById("message");
    const error_element = document.getElementById("error-input");
    var message_text = message_input.value;
  
    if (message_text.trim() === "") 
        return;
    if(!InputValidityData(nickname))


    if(InputValidityData(nickname))
    {
        sessionStorage.setItem('gamer_data', 'true')
        
        console.log(sessionStorage.getItem('gamer_data'));
        
        window.location.href = "/game";
    }
    else

    {

        // Леша выведи сообщение об ошибке в html.


        //ахахахха чё за тупорылый способ вести общение? - Стас
        // И скинь фотку писюна

        error_element.innerHTML = "To send a message, enter your nickname!";
        return;

        // И скинь фотку писюна

    }

    socket.emit("chatMessage", { user: nickname, text: message_text });
    
    ConstructMessage("user-message", { user: nickname, text: message_text });
  
    message_input.value = "";
    error_element.innerHTML = "";
}

socket.on("chatMessage", (message) => 
{

    ConstructMessage("received-message", message);
});


function GenerateClientId() { return Math.random().toString(36).substring(2, 10); }


function ConstructMessage(is, message)
{
    switch(is)
    {
        case "user-message":
        {
            var chat_content = document.querySelector(".chat-content");
            var message_element = document.createElement("div");
           
            message_element.classList.add("user-message");
          
            var user_nickname_element = document.createElement("span");
            
            user_nickname_element.classList.add("user-nickname");
            user_nickname_element.textContent = message.user + ":";
          
            var message_text_element = document.createElement("span");
            
            message_text_element.classList.add("message-text");
            message_text_element.textContent = message.text;
          
            message_element.appendChild(user_nickname_element);
            message_element.appendChild(message_text_element);
            chat_content.appendChild(message_element);
            break;
        }
        case "received-message":
        {
            var chat_content = document.querySelector(".chat-content");
            var message_element = document.createElement("div");
           
            message_element.classList.add("received-message");
          
            var user_nickname_element = document.createElement("span");
            
            user_nickname_element.classList.add("user-nickname");
            user_nickname_element.textContent = message.user + ":";
          
            var message_text_element = document.createElement("span");
            
            message_text_element.classList.add("message-text");
            message_text_element.textContent = message.text;
          
            message_element.appendChild(user_nickname_element);
            message_element.appendChild(message_text_element);
            chat_content.appendChild(message_element);
            break;
        }
    }




    var regex = /^[A-Za-z0-9]{1,15}$/;
    return regex.test(nick);
}

