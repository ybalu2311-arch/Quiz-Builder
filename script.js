let qs=[],edit=-1,current=null,idx=0,answers=[],timerId=null,seconds=0;

const $=id=>document.getElementById(id);

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[c]));

function darkMode(){
  document.body.classList.toggle('dark');
  localStorage.setItem(
    'dark',
    document.body.classList.contains('dark')
  );
}

function typeUI(){
  let t=$('qType').value;

  if(t==='open'){
    $('answers').innerHTML=
      '<input id="openAns" placeholder="Correct answer">';
  }else{
    let a=t==='tf'
      ? ['True','False']
      : ['','','',''];

    $('answers').innerHTML=a.map((x,i)=>`
      <div class="answer">
        <input type="radio" name="ok" value="${i}">
        <input class="ans" value="${esc(x)}" placeholder="Answer ${i+1}">
      </div>
    `).join('');
  }
}

function saveQuestion(){
  let text=$('qText').value.trim();
  let type=$('qType').value;
  let q;

  if(!text)
    return alert('Enter a question.');

  if(type==='open'){
    let a=$('openAns').value.trim();

    if(!a)
      return alert('Enter the correct answer.');

    q={
      text,
      type,
      answers:[a],
      correct:0
    };

  }else{
    let a=[...document.querySelectorAll('.ans')]
      .map(x=>x.value.trim());

    let ok=document.querySelector(
      'input[name=ok]:checked'
    );

    if(a.some(x=>!x)||!ok)
      return alert(
        'Complete answers and choose the correct answer.'
      );

    q={
      text,
      type,
      answers:a,
      correct:+ok.value
    };
  }

  if(edit<0)
    qs.push(q);
  else
    qs[edit]=q;

  edit=-1;
  formReset();
  render();
}

function editQ(i){
  let q=qs[i];

  edit=i;

  $('qText').value=q.text;
  $('qType').value=q.type;

  typeUI();

  setTimeout(()=>{
    if(q.type==='open'){
      $('openAns').value=q.answers[0];
    }else{
      document.querySelectorAll('.ans')
        .forEach((x,n)=>{
          x.value=q.answers[n];
        });

      document.querySelectorAll(
        'input[name=ok]'
      ).forEach((x,n)=>{
        x.checked=n===q.correct;
      });
    }
  },0);

  $('qHead').textContent='Edit Question';
  $('cancel').classList.remove('hide');

  window.scrollTo({
    top:0,
    behavior:'smooth'
  });
}

function cancelEdit(){
  edit=-1;
  formReset();
}

function formReset(){
  $('qText').value='';
  $('qType').value='mcq';
  typeUI();
  $('qHead').textContent='Add Question';
  $('cancel').classList.add('hide');
}

function delQ(i){
  if(confirm('Delete this question?')){
    qs.splice(i,1);
    render();
  }
}

function render(){
  $('preview').innerHTML=
    qs.length
      ? qs.map((q,i)=>`
        <div class="question">
          <b>${i+1}. ${esc(q.text)}</b>
          <p>
            ${
              q.type==='mcq'
                ? 'Multiple Choice'
                : q.type==='tf'
                  ? 'True / False'
                  : 'Open Ended'
            }
          </p>
          <button onclick="editQ(${i})">Edit</button>
          <button onclick="delQ(${i})" class="red">
            Delete
          </button>
        </div>
      `).join('')
      : '<p>No questions yet.</p>';
}

function quiz(){
  return{
    title:$('title').value.trim(),
    description:$('desc').value.trim(),
    random:$('random').checked,
    timer:$('useTimer').checked,
    minutes:+$('minutes').value||10,
    questions:qs
  };
}

function share(){
  let q=quiz();

  if(!q.title||!q.questions.length)
    return alert('Create a quiz first.');

  let s=btoa(
    unescape(
      encodeURIComponent(
        JSON.stringify(q)
      )
    )
  );

  let link=
    location.href.split('#')[0]+
    '#quiz='+
    s;

  copy(link)
    .then(()=>{
      msg('Share link copied.');
    })
    .catch(()=>{
      prompt(
        'Copy this link:',
        link
      );
    });
}

async function copy(t){
  if(
    navigator.clipboard &&
    window.isSecureContext
  ){
    return navigator.clipboard.writeText(t);
  }

  let x=document.createElement('textarea');

  x.value=t;
  x.style.position='fixed';
  x.style.left='-9999px';

  document.body.appendChild(x);

  x.focus();
  x.select();

  let ok=document.execCommand('copy');

  x.remove();

  if(!ok)
    throw Error('copy');
}

function play(){
  let q=quiz();

  if(!q.title||!q.questions.length)
    return alert('Create a quiz first.');

  current=JSON.parse(
    JSON.stringify(q)
  );

  if(current.random){
    current.questions.sort(
      ()=>Math.random()-.5
    );
  }

  idx=0;

  answers=
    Array(
      current.questions.length
    ).fill(null);

  $('builder').classList.add('hide');
  $('player').classList.remove('hide');
  $('result').classList.add('hide');

  $('studentName').value='';
  $('studentId').value='';

  $('playTitle').textContent=
    current.title;

  $('playDesc').textContent=
    current.description;

  if(current.timer)
    startTimer(
      current.minutes*60
    );
  else
    stopTimer();

  showQ();
}

function showQ(){
  let q=current.questions[idx];
  let a=answers[idx];

  let html=`
    <div class="question">
      <h3>
        ${idx+1}. ${esc(q.text)}
      </h3>
  `;

  if(q.type==='open'){
    html+=`
      <input
        id="openPlayer"
        value="${a==null?'':esc(a)}"
        oninput="saveA()"
        placeholder="Type your answer"
      >
    `;
  }else{
    html+=q.answers.map((x,i)=>`
      <label class="option">

        <input
          type="radio"
          name="pick"
          value="${i}"
          ${+a===i?'checked':''}
          onchange="saveA()"
        >

        ${esc(x)}

      </label>
    `).join('');
  }

  $('questionArea').innerHTML=
    html+'</div>';

  $('prev').disabled=
    idx===0;

  $('next').classList.toggle(
    'hide',
    idx===current.questions.length-1
  );

  $('submit').classList.toggle(
    'hide',
    idx!==current.questions.length-1
  );

  progress();
}

function saveA(){
  let q=current.questions[idx];

  if(q.type==='open'){
    answers[idx]=
      $('openPlayer').value;
  }else{
    let x=
      document.querySelector(
        'input[name=pick]:checked'
      );

    answers[idx]=
      x ? +x.value : null;
  }

  progress();
}

function prev(){
  saveA();

  if(idx>0){
    idx--;
    showQ();
  }
}

function next(){
  saveA();

  if(idx<current.questions.length-1){
    idx++;
    showQ();
  }
}

function progress(){
  let n=
    answers.filter(
      x=>x!==null&&x!==''
    ).length;

  let p=
    Math.round(
      n/current.questions.length*100
    );

  $('bar').style.width=
    p+'%';

  $('progress').textContent=
    `Answered: ${n}/${current.questions.length}`;
}

function submitQuiz(){

  saveA();

  let name=
    $('studentName').value.trim();

  let id=
    $('studentId').value.trim();

  if(!name||!id)
    return alert(
      'Enter Student Name and Student ID.'
    );

  if(!confirm('Submit quiz?'))
    return;

  stopTimer();

  let rans=[];
  let score=0;

  current.questions.forEach((q,i)=>{

    let a=answers[i];

    let sa='Not answered';

    let ca=q.answers[q.correct];

    if(q.type==='open'){
      if(a!=='')
        sa=a;
    }else if(a!==null){
      sa=q.answers[a];
    }

    let ok=
      q.type==='open'
        ? String(a??'')
            .trim()
            .toLowerCase()===
          String(ca)
            .trim()
            .toLowerCase()
        : Number(a)===q.correct;

    if(ok)
      score++;

    rans.push({
      question:q.text,
      student:sa,
      correct:ca,
      ok
    });
  });

  let r={
    name,
    id,
    quiz:current.title,
    score,
    total:current.questions.length,
    percent:
      Math.round(
        score/current.questions.length*100
      ),
    time:new Date().toISOString(),
    answers:rans
  };

  let h=
    JSON.parse(
      localStorage.getItem(
        'results'
      )||'[]'
    );

  h.push(r);

  localStorage.setItem(
    'results',
    JSON.stringify(h)
  );

  showResult(r);
  history();
}

function showResult(r){

  $('result').classList.remove(
    'hide'
  );

  $('result').innerHTML=`
    <h2>Quiz Result</h2>

    <p>
      <b>Name:</b>
      ${esc(r.name)}
    </p>

    <p>
      <b>Student ID:</b>
      ${esc(r.id)}
    </p>

    <p>
      <b>Marks:</b>
      ${r.score}/${r.total}
    </p>

    <p>
      <b>Percentage:</b>
      ${r.percent}%
    </p>

    <hr>

    ${r.answers.map((a,i)=>`

      <div
        class="${a.ok?'correct':'wrong'}"
      >

        <b>
          Q${i+1}.
          ${esc(a.question)}
        </b>

        <p>
          Your answer:
          ${esc(a.student)}
        </p>

        <p>
          Correct answer:
          ${esc(a.correct)}
        </p>

        <b>
          ${a.ok?'Correct':'Wrong'}
        </b>

      </div>

    `).join('')}
  `;

  scrollTo(
    0,
    document.body.scrollHeight
  );
}

function history(){

  let h=
    JSON.parse(
      localStorage.getItem(
        'results'
      )||'[]'
    );

  $('history').innerHTML=
    h.length
      ? `
        <table>

          <tr>
            <th>Name</th>
            <th>ID</th>
            <th>Quiz</th>
            <th>Marks</th>
            <th>%</th>
          </tr>

          ${h.slice().reverse().map(r=>`

            <tr>

              <td>
                ${esc(r.name)}
              </td>

              <td>
                ${esc(r.id)}
              </td>

              <td>
                ${esc(r.quiz)}
              </td>

              <td>
                ${r.score}/${r.total}
              </td>

              <td>
                ${r.percent}%
              </td>

            </tr>

          `).join('')}

        </table>
      `
      : '<p>No results yet.</p>';
}

function startTimer(s){

  stopTimer();

  seconds=s;

  $('timer').classList.remove(
    'hide'
  );

  tick();

  timerId=
    setInterval(()=>{
      seconds--;

      tick();

      if(seconds<=0){

        stopTimer();

        if(
          !$('studentName').value.trim()||
          !$('studentId').value.trim()
        ){
          return alert(
            'Enter Student Name and Student ID.'
          );
        }

        calculateAutoSubmit();
      }

    },1000);
}

function tick(){

  $('timer').textContent=
    String(
      Math.floor(seconds/60)
    ).padStart(2,'0')+
    ':'+
    String(
      seconds%60
    ).padStart(2,'0');

  $('timer').classList.toggle(
    'warn',
    seconds<=60
  );
}

function stopTimer(){

  if(timerId){
    clearInterval(timerId);
    timerId=null;
  }

  $('timer').classList.add(
    'hide'
  );
}

function calculateAutoSubmit(){

  saveA();

  let name=
    $('studentName').value.trim();

  let id=
    $('studentId').value.trim();

  let score=0;
  let rans=[];

  current.questions.forEach(
    (q,i)=>{

      let a=answers[i];

      let ca=
        q.answers[q.correct];

      let sa=
        q.type==='open'
          ? a||'Not answered'
          : a==null
            ? 'Not answered'
            : q.answers[a];

      let ok=
        q.type==='open'
          ? String(a||'')
              .trim()
              .toLowerCase()===
            String(ca)
              .trim()
              .toLowerCase()
          : Number(a)===q.correct;

      if(ok)
        score++;

      rans.push({
        question:q.text,
        student:sa,
        correct:ca,
        ok
      });

    }
  );

  let r={
    name,
    id,
    quiz:current.title,
    score,
    total:current.questions.length,
    percent:
      Math.round(
        score/current.questions.length*100
      ),
    time:new Date().toISOString(),
    answers:rans
  };

  let h=
    JSON.parse(
      localStorage.getItem(
        'results'
      )||'[]'
    );

  h.push(r);

  localStorage.setItem(
    'results',
    JSON.stringify(h)
  );

  showResult(r);
  history();
}

function back(){

  stopTimer();

  $('player').classList.add(
    'hide'
  );

  $('builder').classList.remove(
    'hide'
  );

  $('result').classList.add(
    'hide'
  );
}

function clearQuiz(){

  if(
    !confirm(
      'Clear current quiz?'
    )
  )
    return;

  qs=[];

  $('title').value='';
  $('desc').value='';
  $('random').checked=false;
  $('useTimer').checked=false;

  render();

  msg('Quiz cleared.');
}

function msg(x){

  $('msg').textContent=x;

  setTimeout(
    ()=>$('msg').textContent='',
    2500
  );
}

function loadLink(){

  if(
    !location.hash.startsWith(
      '#quiz='
    )
  )
    return;

  try{

    let q=
      JSON.parse(
        decodeURIComponent(
          escape(
            atob(
              location.hash.slice(6)
            )
          )
        )
      );

    $('title').value=
      q.title||'';

    $('desc').value=
      q.description||'';

    $('random').checked=
      !!q.random;

    $('useTimer').checked=
      !!q.timer;

    $('minutes').value=
      q.minutes||10;

    qs=
      q.questions||[];

    render();

  }catch{

    alert(
      'Invalid share link.'
    );
  }
}

$('useTimer')
  .addEventListener(
    'change',
    ()=>{
      $('minutes').style.display=
        $('useTimer').checked
          ? 'block'
          : 'none';
    }
  );

if(
  localStorage.getItem('dark')===
  'true'
){
  document.body.classList.add(
    'dark'
  );
}

$('minutes').style.display=
  'none';

typeUI();
render();
history();
loadLink();