function SaveGamerSession()
{
    var nickname = document.getElementById("input").value;

    if(InputValidityData(nickname))
        window.location.href = "/game";
    else
    {
        // Леша выведи сообщение об ошибке в html.

<<<<<<< HEAD
        //ахахахха чё за тупорылый способ вести общение? - Стас
=======
        // И скинь фотку писюна
>>>>>>> bibaboba
    }
}

function InputValidityData(nick)
{
    var regex = /^[A-Za-z0-9]{1,15}$/;
    return regex.test(nick);
}

function GenerateClientId() { return Math.random().toString(36).substring(2, 10); }

