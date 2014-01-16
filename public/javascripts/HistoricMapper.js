jQuery.fn.exists = function(){return this.length>0;}

function validateEmail(email) { 
  // http://stackoverflow.com/a/46181/11236		  
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function addValidationMessage(fieldName, message){
	var errorHTML = '<span class="help-block ' + fieldName + 'Error validationError has-error"><span class="glyphicon glyphicon-exclamation-sign"></span>' + message + '</span>'
	var htmlElement = $(errorHTML).insertAfter('#' + fieldName);
	htmlElement.parent().addClass('has-error');
}

function removeValidationMessage (fieldName) {
	var htmlElement = $('.' + fieldName + 'Error.validationError');
	htmlElement.parent().removeClass('has-error');
	htmlElement.remove();
}

$.validator.setDefaults({
	// submitHandler: function(form) { 
	// 	var bob = 5;
	//  },
	highlight: function(element) {
		$(element).closest('.control-group').removeClass('success').addClass('error');
	}/*,
	success: function(element) {
		element
		.text('OK!').addClass('valid')
		.closest('.control-group').removeClass('error').addClass('success');
	}*/	
});

function localStorageSupported() {
	try {
		return "localStorage" in window && window["localStorage"] !== null;
	} catch (e) {
		return false;
	}
}