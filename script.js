let users=JSON.parse(localStorage.getItem("users"))||[];
let quizzes=JSON.parse(localStorage.getItem("quizzes"))||[];
let results=JSON.parse(localStorage.getItem("results"))||[];

let questions=[],currentQuiz=null,currentQuestion=0;
let obtainedMarks=0,selected="",timerInterval,timeLeft=0;
let currentStudent=null;

function get(id){return document.getElementById(id)}

function show(id){
    document.querySelectorAll(".box").forEach(x=>x.classList.add("hide"));
    get(id).classList.remove("hide");
}

function signup(){
    let id=get("studentId").value.trim();
    let name=get("studentName").value.trim();
    let u=get("signUser").value.trim();
    let p=get("signPass").value.trim();

    if(!id||!name||!u||!p)return alert("Fill all details");
    if(users.some(x=>x.studentId===id))
        return alert("Student ID already exists");
    if(users.some(x=>x.username===u))
        return alert("Username already exists");

    users.push({studentId:id,name:name,username:u,password:p});
    localStorage.setItem("users",JSON.stringify(users));

    alert("Signup successful");
    show("studentLoginPage");
}

function login(){
    let u=get("loginUser").value.trim();
    let p=get("loginPass").value.trim();

    if(u==="admin"&&p==="admin123"){
        show("adminPage");
        showHistory();
    }else{
        alert("Invalid admin login. Use Student Login for students.");
    }
}

function studentLogin(){
    let u=get("studentLoginUser").value.trim();
    let p=get("studentLoginPass").value.trim();

    if(u==="student"&&p==="student123"){
        currentStudent={
            studentId:"STUDENT",
            name:"Student",
            username:"student"
        };
    }else{
        currentStudent=users.find(
            x=>x.username===u&&x.password===p
        );

        if(!currentStudent)
            return alert("Invalid student username or password");
    }

    localStorage.setItem("currentUser",u);
    show("userPage");

    get("writeId").value=currentStudent.studentId;
    get("writeName").value=currentStudent.name;

    loadUserPage();
}

function changeType(){
    let t=get("type").value;

    get("mcqFields").classList.toggle("hide",t!=="mcq");
    get("tfFields").classList.toggle("hide",t!=="tf");
    get("fillFields").classList.toggle("hide",t!=="fill");
}

function addQuestion(){
    let t=get("type").value;
    let q=get("question").value.trim();
    let m=Number(get("marks").value);

    if(!q||m<=0)return alert("Enter question and marks");

    let obj={type:t,question:q,marks:m};

    if(t==="mcq"){
        obj.options=[
            get("op1").value.trim(),
            get("op2").value.trim(),
            get("op3").value.trim(),
            get("op4").value.trim()
        ];

        obj.answer=get("correct").value.trim().toUpperCase();

        if(obj.options.some(x=>!x))
            return alert("Enter all options");

        if(!["A","B","C","D"].includes(obj.answer))
            return alert("Answer must be A, B, C or D");
    }

    if(t==="tf")
        obj.answer=get("tfAnswer").value;

    if(t==="fill"){
        obj.answer=get("fillAnswer").value.trim().toLowerCase();

        if(!obj.answer)
            return alert("Enter correct answer");
    }

    questions.push(obj);
    displayQuestions();
    clearQuestionFields();
}

function displayQuestions(){
    get("questionList").innerHTML=questions.map(
        (x,i)=>
        `<div>${i+1}. ${x.question} | ${x.type} | ${x.marks} Marks</div>`
    ).join("");
}

function clearQuestionFields(){
    [
        "question","marks","op1","op2",
        "op3","op4","correct","fillAnswer"
    ].forEach(id=>get(id).value="");
}

function saveQuiz(){
    let title=get("quizTitle").value.trim();
    let time=Number(get("quizTime").value);

    if(!title||time<=0||!questions.length)
        return alert("Enter quiz title, time and questions");

    let total=questions.reduce((s,x)=>s+x.marks,0);

    quizzes.push({
        title:title,
        time:time,
        totalMarks:total,
        questions:questions
    });

    localStorage.setItem("quizzes",JSON.stringify(quizzes));

    alert("Quiz saved successfully\nTotal Marks: "+total);

    questions=[];
    get("questionList").innerHTML="";
    get("quizTitle").value="";
    get("quizTime").value="";
}

function loadUserPage(){
    quizzes=JSON.parse(localStorage.getItem("quizzes"))||[];

    get("quizList").innerHTML=quizzes.length?
        quizzes.map((x,i)=>`
        <div>
            <b>${x.title}</b><br>
            Time: ${x.time} Minutes<br>
            Total Marks: ${x.totalMarks}
            <button onclick="startQuiz(${i})">PLAY QUIZ</button>
        </div>`).join("")
        :"No quizzes available";

    showResults();
}

function showResults(){
    let u=localStorage.getItem("currentUser");
    let data=results.filter(x=>x.username===u);

    get("myResults").innerHTML=data.length?
        data.map(x=>`
        <div>
            Student ID: ${x.studentId}<br>
            Name: ${x.name}<br>
            Quiz: ${x.quiz}<br>
            Marks: ${x.obtained}/${x.totalMarks}
        </div>`).join("")
        :"No results yet";
}

function startQuiz(i){
    let id=get("writeId").value.trim();
    let name=get("writeName").value.trim();

    if(!id||!name)
        return alert("Enter Student ID and Student Name");

    currentStudent={
        studentId:id,
        name:name,
        username:localStorage.getItem("currentUser")
    };

    currentQuiz=quizzes[i];
    currentQuestion=0;
    obtainedMarks=0;
    selected="";
    timeLeft=currentQuiz.time*60;

    clearInterval(timerInterval);
    timerInterval=setInterval(updateTimer,1000);

    show("quizPage");
    loadQuestion();
    updateTimer();
}

function updateTimer(){
    let min=Math.floor(timeLeft/60);
    let sec=timeLeft%60;

    get("timer").innerText=
        "Time: "+String(min).padStart(2,"0")+":"+
        String(sec).padStart(2,"0");

    if(timeLeft<=0){
        clearInterval(timerInterval);
        finishQuiz();
        return;
    }

    timeLeft--;
}

function loadQuestion(){
    let q=currentQuiz.questions[currentQuestion];

    get("playTitle").innerText=currentQuiz.title;
    get("questionNumber").innerText=
        "Question "+(currentQuestion+1)+
        " of "+currentQuiz.questions.length;

    get("playQuestion").innerText=q.question;
    get("questionMarks").innerText="Marks: "+q.marks;

    get("playOptions").innerHTML="";
    get("fillInput").value="";
    get("fillInput").classList.add("hide");

    if(q.type==="mcq"){
        q.options.forEach((x,i)=>{
            let l=String.fromCharCode(65+i);

            get("playOptions").innerHTML+=
            `<button onclick="selectOption('${l}')">
                ${l}. ${x}
            </button>`;
        });
    }

    if(q.type==="tf"){
        get("playOptions").innerHTML=
        `<button onclick="selectOption('True')">True</button>
         <button onclick="selectOption('False')">False</button>`;
    }

    if(q.type==="fill")
        get("fillInput").classList.remove("hide");
}

function selectOption(x){
    selected=x;
}

function submitAnswer(){
    let q=currentQuiz.questions[currentQuestion];
    let answer=selected;

    if(q.type==="fill")
        answer=get("fillInput").value.trim().toLowerCase();

    if(!answer)return alert("Answer the question");

    if(answer===q.answer)
        obtainedMarks+=q.marks;

    selected="";
    currentQuestion++;

    if(currentQuestion<currentQuiz.questions.length)
        loadQuestion();
    else
        finishQuiz();
}

function finishQuiz(){
    clearInterval(timerInterval);

    results.push({
        studentId:currentStudent.studentId,
        name:currentStudent.name,
        username:currentStudent.username,
        quiz:currentQuiz.title,
        obtained:obtainedMarks,
        totalMarks:currentQuiz.totalMarks
    });

    localStorage.setItem("results",JSON.stringify(results));

    alert(
        "Quiz Completed!\n"+
        "Student ID: "+currentStudent.studentId+
        "\nName: "+currentStudent.name+
        "\nMarks: "+obtainedMarks+"/"+currentQuiz.totalMarks
    );

    show("userPage");
    loadUserPage();
}

function showHistory(){
    results=JSON.parse(localStorage.getItem("results"))||[];

    results=results.filter(
        x=>x.studentId&&x.name&&x.quiz
    );

    if(!results.length){
        get("history").innerHTML="<p>No student results yet</p>";
        return;
    }

    get("history").innerHTML=`
    <table>
        <tr>
            <th>Student ID</th>
            <th>Name</th>
            <th>Quiz</th>
            <th>Marks</th>
        </tr>

        ${results.map(x=>`
        <tr>
            <td>${x.studentId}</td>
            <td>${x.name}</td>
            <td>${x.quiz}</td>
            <td>${x.obtained}/${x.totalMarks}</td>
        </tr>`).join("")}
    </table>`;
}

function logout(){
    clearInterval(timerInterval);
    localStorage.removeItem("currentUser");
    currentStudent=null;
    show("loginPage");
}
