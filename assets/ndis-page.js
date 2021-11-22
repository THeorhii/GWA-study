// NDIS page //
const ndisForm = document.querySelector('.ndis__contact-form')
const ndisFormBtn = document.querySelector('.ndis__btn')
const ndisContactFormName = document.querySelector('#ContactFormName')
const ndisContactFormEmail = document.querySelector('#ContactFormEmail')
const ndisContactFormPhone = document.querySelector('#ContactFormPhone')
const ndisContactFormSubject = document.querySelector('#ContactFormSubject')
const ndisContactFormMessage = document.querySelector('#ContactFormMessage')
let ndisFormInputItems = document.querySelectorAll('.ndis-form__item')

function stopSubmitForm(formContainer) {
    formContainer.onsubmit = (e) => {e.preventDefault()}
}
function startSubmitForm(formContainer) {
    formContainer.submit()
}

// email validate
function validateEmail(inputEmail) {
    let emailValue = inputEmail.value
    if (validateEmailRegEx(emailValue) != true ) {
        inputEmail.classList.add('ndis-input--required')
        NdisCheckValidateErrors.push(false)
    }
    else if (validateEmailRegEx(emailValue) == true ) {
        inputEmail.classList.add('ndis-input--check')
        NdisCheckValidateErrors.push(true)
    }

}
function validateEmailRegEx(email) {
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

// tel validate
function validateTel(inputTel) {
    let telValue = inputTel.value
    if (validateTelRegEx(telValue) != true || telValue.length < 6 ) {
        inputTel.classList.add('ndis-input--required')
        NdisCheckValidateErrors.push(false)
        document.querySelector(".ndis-input-tel--required").style.display = 'flex'
    }
    else if (validateTelRegEx(telValue) == true && inputTel.value.length >= 6) {
        inputTel.classList.add('ndis-input--check')
        NdisCheckValidateErrors.push(true)
        document.querySelector(".ndis-input-tel--required").style.display = 'none'
    }
}
function validateTelRegEx(tel) {
    const re = /^[0-9\-\+]{9,15}$/;
    return re.test(tel);
}

// text validate
function ndisTextValidate(inputItem, textLength) {
    if (inputItem.value.length < textLength) {
        inputItem.classList.add('ndis-input--required')
        NdisCheckValidateErrors.push(false)
    }
    else if (inputItem.value.length >= textLength) {
        inputItem.classList.add('ndis-input--check')
        NdisCheckValidateErrors.push(true)
    }
}
function checkAllItemRegEx(RegEx, array) {
    array.forEach(item => {
        if (RegEx.test(item) === false) {
            let indexItem = array.indexOf(item)
            array.splice(indexItem, 1)
        }
    })
}

// all ndisInputValidate
function allNdisValidate() {
    ndisFormInputItems.forEach(item => {
        item.classList.remove('ndis-input--required');
        item.classList.remove('ndis-input--check')
    })
    validateEmail(ndisContactFormEmail)
    validateTel(ndisContactFormPhone)
    ndisTextValidate(ndisContactFormName, 2)
    ndisTextValidate(ndisContactFormSubject, 3)
    ndisTextValidate(ndisContactFormMessage, 15)
}

let NdisCheckValidateErrors = []

ndisFormBtn.addEventListener('click', (e) => {
    stopSubmitForm(ndisForm)
    NdisCheckValidateErrors = []
    allNdisValidate()


    if (NdisCheckValidateErrors.every(elem => elem == true)) {
        startSubmitForm(ndisForm)
    }

})
ndisContactFormPhone.addEventListener('input', () => {
    let valueTel = ndisContactFormPhone.value

    if (/^[0-9\+]{1,15}$/.test(valueTel) == false) {
        let checkArray = valueTel.split('')
        checkAllItemRegEx(/^[0-9\+]{1,15}$/, checkArray)
        ndisContactFormPhone.value = checkArray.join('')
        document.querySelector(".ndis-input-tel--required").style.display = 'flex'
    }
})