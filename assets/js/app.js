import users from './users.js';

const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const labelWelcome = $('.welcome');
const labelBalance = $('.balance__value');
const labelSumIn = $('.summary__value--in');
const labelSumOut = $('.summary__value--out');
const labelSumInterest = $('.summary__value--interest');
const labelDate = $('.date');
const labelTimer = $('.timer');

const containerApp = $('.app');
const containerMovements = $('.movements');

const btnLogin = $('.login__btn');
const btnSort = $('.btn--sort');
const btnTransfer = $('.form__btn--transfer');
const btnLoan = $('.form__btn--loan');
const btnClose = $('.form__btn--close');

const inputLoginUsername = $('.login__input--user');
const inputLoginPin = $('.login__input--pin');
const inputCloseUsername = $('.form__input--user');
const inputClosePin = $('.form__input--pin');
const inputTransferTo = $('.form__input--to');
const inputTransferAmount = $('.form__input--amount');
const inputLoanAmount = $('.form__input--loan-amount');

let currentUser;
let logOutInterval;

(() => {
    users.forEach(user => {
        user.username = user.owner
            .toLowerCase()
            .split(' ')
            .map(x => x[0])
            .join('');
    });
})();

const renderTimer = timer => {
    const minutes = `${Math.floor(timer / 60)}`.padStart(2, 0);
    const seconds = `${timer % 60}`.padStart(2, 0);

    labelTimer.textContent = `${minutes}:${seconds}`;
};

const logOut = () => {
    labelWelcome.textContent = 'Log in to get started';
    containerApp.style.opacity = '0';

    inputLoginUsername.value = '';
    inputLoginUsername.blur();

    currentUser = null;
};

const startCounters = () => {
    let timer = 5 * 60;

    logOutInterval && clearInterval(logOutInterval);

    renderTimer(timer);

    logOutInterval = setInterval(() => {
        timer--;
        renderTimer(timer);
        if (timer === 0) {
            clearInterval(logOutInterval);
            logOut();
        }
    }, 1000);
};

const calcDayPassed = (date1, date2) => {
    return Math.round(Math.abs(date2 - date1) / (1000 * 60 * 60 * 24));
};

const displayDate = (date, options, formatDate) => {
    const dayPassed = calcDayPassed(new Date(), date);

    switch (true) {
        case dayPassed === 0 && !formatDate:
            return 'Today';
        case dayPassed === 1 && !formatDate:
            return 'Yesterday';
        case dayPassed <= 7 && !formatDate:
            return `${dayPassed} days ago`;
        default:
            return new Intl.DateTimeFormat(navigator.language, options).format(date);
    }
};

const displayCurrency = value => {
    return new Intl.NumberFormat(currentUser.locale, {
        style: 'currency',
        currency: currentUser.currency,
    }).format(value);
};

const renderMovements = (movements, sort) => {
    containerMovements.innerHTML = '';

    const cloneMovements = JSON.parse(JSON.stringify(movements));

    if (sort) {
        sort === 'asc'
            ? cloneMovements.sort((a, b) => a[0] - b[0])
            : cloneMovements.sort((a, b) => b[0] - a[0]);
    }

    cloneMovements.forEach((mov, i) => {
        const type = mov[0] >= 0 ? 'deposit' : 'withdrawal';

        const html = `
            <div class="movements__row">
                <div class="movements__type movements__type--${type}">${i + 1} ${type}</div>
                <div class="movements__date">${displayDate(new Date(mov[1]))}</div>
                <div class="movements__value">${displayCurrency(mov[0])}</div>
            </div>
        `;

        containerMovements.insertAdjacentHTML('afterbegin', html);
    });
};

const renderBalance = movements => {
    currentUser.balanceVal = movements.reduce((acc, move) => acc + move);
    labelBalance.textContent = `${displayCurrency(currentUser.balanceVal)}`;
};

const renderSummary = movements => {
    currentUser.sumInVal = movements.filter(mov => mov > 0).reduce((acc, move) => acc + move);
    labelSumIn.textContent = `${displayCurrency(currentUser.sumInVal)}`;

    currentUser.sumOutVal = movements.filter(mov => mov < 0).reduce((acc, move) => acc + move);
    labelSumOut.textContent = `${displayCurrency(Math.abs(currentUser.sumOutVal))}`;

    currentUser.sumInterestVal = movements
        .filter(mov => mov > 0)
        .map(deposit => (deposit * currentUser.interestRate) / 100)
        .filter(x => x >= 1)
        .reduce((acc, move) => acc + move);
    labelSumInterest.textContent = `${displayCurrency(currentUser.sumInterestVal)}`;
};

const updateUI = () => {
    const movements = currentUser.movements.map(mov => mov[0]);

    renderBalance(movements);
    renderMovements(currentUser.movements);
    renderSummary(movements);

    startCounters();
};

const login = e => {
    e.preventDefault();

    const inputLoginUsernameVal = inputLoginUsername.value;
    const inputLoginPinVal = inputLoginPin.value;

    if (!inputLoginUsernameVal || !inputLoginPinVal) {
        alert('Please enter username and PIN to login!');
        return;
    }

    currentUser = users.find(user => user.username === inputLoginUsernameVal);
    if (!currentUser || currentUser?.pin !== +inputLoginPinVal) {
        alert('Wrong username or PIN!');
        return;
    }

    if (currentUser.active === false) {
        const secretCode = prompt('Please enter your secret code to active your account!');
        if (currentUser.secretCode !== secretCode) {
            alert('Wrong secret code!');
            return;
        }

        currentUser.active = true;
        currentUser.secretCode = '';
    }

    const options = {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
    };

    labelWelcome.textContent = `Welcome back, ${currentUser.owner.split(' ')[0]}`;
    labelDate.textContent = `${displayDate(new Date(), options, true)}`;
    containerApp.style.opacity = '1';

    inputLoginPin.value = '';
    inputLoginPin.blur();

    updateUI();
};

const sortHandler = function (e) {
    const sortdirection =
        e.target.dataset.sort === 'asc' ? ['desc', '&downarrow;'] : ['asc', '&uparrow;'];
    this.dataset.sort = sortdirection[0];
    this.innerHTML = `${sortdirection[1]} SORT`;

    renderMovements(currentUser.movements, sortdirection[0]);
};

const transferHandler = e => {
    e.preventDefault();

    const inputTransferToVal = +inputTransferTo.value;
    const inputTransferAmountVal = +inputTransferAmount.value;

    if (inputTransferAmountVal <= 0 || inputTransferAmountVal >= currentUser.balanceVal) {
        alert('Invalid transfer amount!');
        return;
    }

    const receivedUser = users.find(user => user.pin === inputTransferToVal);
    if (!inputTransferToVal || inputTransferToVal === currentUser.pin || !receivedUser) {
        alert("Invalid transfer PIN's received user!");
        return;
    }

    currentUser.movements.push([-inputTransferAmountVal, new Date().toISOString()]);
    receivedUser.movements.push([inputTransferAmountVal, new Date().toISOString()]);

    updateUI();

    inputTransferTo.value = '';
    inputTransferAmount.value = '';
};

const loanHandler = e => {
    e.preventDefault();

    const inputLoanAmountVal = Math.floor(inputLoanAmount.value);

    if (
        inputLoanAmountVal <= 0 ||
        !currentUser.movements.some(mov => mov[0] >= inputLoanAmountVal * 0.1)
    ) {
        alert('Invalid loan amount!');
        return;
    }

    currentUser.movements.push([inputLoanAmountVal, new Date().toISOString()]);
    updateUI();
    inputLoanAmount.value = '';
};

const closeHandler = e => {
    e.preventDefault();

    const inputCloseUsernameVal = inputCloseUsername.value;
    const inputClosePinVal = +inputClosePin.value;

    if (!inputCloseUsernameVal || !inputClosePinVal) {
        alert('Username and PIN must be provided!');
        return;
    }

    if (inputCloseUsernameVal !== currentUser.username || inputClosePinVal !== currentUser.pin) {
        alert('Wrong username or PIN!');
        return;
    }

    const secretCode = prompt(
        'Please enter your secret code to active your account in future!',
        'Secret Code'
    );

    if (secretCode) {
        const curentLogin = users.find(user => user.pin === inputClosePinVal);
        curentLogin.active = false;
        curentLogin.secretCode = secretCode;

        logOut();
    }

    inputCloseUsername.value = inputClosePin.value = '';
};

btnLogin.addEventListener('click', login);

btnSort.addEventListener('click', sortHandler);

btnTransfer.addEventListener('click', transferHandler);

btnLoan.addEventListener('click', loanHandler);

btnClose.addEventListener('click', closeHandler);
