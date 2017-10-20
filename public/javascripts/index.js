

var index = (function(win,$) {
    


    $.ajax({
        url : '/users',
        type: 'POST',
        data: {data:JSON.stringify(data)},
        dataType: 'json',
        beforeSend: function() {


        },
        success : function(res) {


        },
        error:function(error){
			
        }   	    		    	
    });			  


})(window,jQuery)