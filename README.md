## API Folder Structure

```
.
├── config                  # App configuration files
│   ├── sequalize.json        # Sequalize config
│   ├── serviceOne.json       # ServiceOne config
│   └── ...                 # Other configurations
├── routes                  
│   ├── controllers         # Request managers
│   ├── middlewares         # Request middlewares
│   └── routes.js           # Define routes and middlewares here
├── services                # External services implementation   
│   ├── serviceOne
│   └── serviceTwo
│   └── ...                 # Other services
├── db                      # Data access stuff  (Sequalize mostly)
│   ├── models              # Models
│   ├── migrations          # Migrations
│   ├── seeds               # Seeds
│   └── index.js            # Sequalize instantiation
├── core                    # Business logic implementation
│   ├── accounts.js         
│   ├── sales.js            
│   ├── comments.js              
│   └── ...   
├── tests                    
│   ├── accounts.test.js         
│   ├── sales.test.js            
│   ├── comments.test.js              
│   └── ...  
├── helpers     
│   ├── events         
│   ├── logs            
├── pm2.js                  # pm2 init
├── shipitfile.js           # deployment automation file
├── package.json           
├── README.md         
└── app.js                  # App starting point

```

## Naming Conventions
*varible names* - camelCase `Eg: firstName` - give special attention to singular and plural

*function names* - camelCase `Eg: vaidateEmail` - use meaningful names and give special attention to singular and plural

	A function should be used to perform only one operation
        max 20 lines
        
*file names* - snakeCase `Eg: account-details.js`

*Indendations*

	use space before and after "=" in variable declaration
	use tab to indent function body	
	use function or condition opening in the same line (Eg: if(val > 10) { )
    
Use comments if it really needs to be explained

```
/**
*@method 
*@params 
*@returns 
*
*/
```


## Endpoint Response json format


### many:

```
{
  data: [
    {
       id: 1234567
       type: "users",
       attributes: {
         field1: "valu1",
         field2: "value2"
       }
    },
    {
       id: 4879879,
       type: "users",
       attributes: {
         field1: "valu1",
         field2: "value2"
       }
    }
  ]
}
```


### one:

```
{
  data: {
    id: 37827482,
    type: "users",
    attributes: {
       field1: "valu1",
       field2: "value2"
    },
    relationship: {
      asset: {
        data: [
	  {
	    id: 4879879,
            type: "asset"
	  },
	  {
	    id: 8787898,
            type: "asset"
	  },
        ]
      }	 
    }
  }
}
```

## Run test
`> npm test`

