

var index = (function(win,$) {
    
    $.ajax({
        url : '/',
        type: 'get',
        // data: {data:JSON.stringify(data)},
        dataType: 'json',
        beforeSend: function() {

        },
        success : function(res) {

            console.log(res);
        },
        error:function(error){
			
        }   	    		    	
    });			  


})(window,jQuery)