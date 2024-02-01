sap.ui.define([
    'ey/hr/payroll/controller/BaseController',
    'sap/ui/model/json/JSONModel',
    'sap/m/MessageBox',
    'sap/m/MessageToast',
    'sap/ui/core/Fragment'
], function(BaseController, JSONModel, MessageBox, MessageToast, Fragment) {
    'use strict';
    return BaseController.extend("ey.hr.payroll.controller.Add",{
        onInit: function(){
            //create local json model
            var oJsonModel = new JSONModel();
            //get the payload from postman tool and set to the local model
            oJsonModel.setData({
                "prodData": {
                    "PRODUCT_ID": "",
                    "TYPE_CODE": "PR",
                    "CATEGORY": "Notebooks",
                    "NAME": "",
                    "DESCRIPTION": "",
                    "SUPPLIER_ID": "0100000046",
                    "SUPPLIER_NAME": "SAP",
                    "TAX_TARIF_CODE": "1 ",
                    "MEASURE_UNIT": "EA",
                    "PRICE": "0.00",
                    "CURRENCY_CODE": "USD",
                    "DIM_UNIT": "CM",
                    "PRODUCT_PIC_URL": "/sap/public/bc/NWDEMO_MODEL/IMAGES/"
                }
            });
            //set model to the our view as named model
            this.getView().setModel(oJsonModel, "hunk");
            //create global variable for ease of use for local model
            this.oLocalModel = oJsonModel;
        },
        
        onLoadExp: function(){
            //step 1: know the category
            var cat = this.oLocalModel.getProperty("/prodData/CATEGORY");
            //Step 2: get odata model object
            var oDataModel = this.getOwnerComponent().getModel();
            //step 3: call function import
            var that = this;
            oDataModel.callFunction("/GetMostExpensiveProduct",{
                urlParameters:{
                    I_CATEGORY: cat
                },
                success: function(data){
                    //step 4: set data to local model once success callback
                    //set this data to local model - 2way binding
                    that.oLocalModel.setProperty("/prodData", data);
                    //change the mode to update mode
                    that.setMode("Update");
                }                
            });
            
        },
        onProductSubmit: function(oEvent){
            //Step 1: extract the value of product id enetered by user
            var sVal = oEvent.getParameter("value");
            //Step 2: Get the odata model object
            var oDataModel = this.getOwnerComponent().getModel();
            //Step 3: Call the odata service to load single product data
            var that = this;
            oDataModel.read("/ProductSet('" + sVal + "')",{
                success: function(data){
                    //set this data to local model - 2way binding
                    that.oLocalModel.setProperty("/prodData", data);
                    //change the mode to update mode
                    that.setMode("Update");
                },
                error: function(oErr){
                    MessageToast.show("The product does not exist, please proceed with creation");
                    //TODO: Extract message comig from SAP System and print in console
                    console.log(JSON.parse(oErr.responseText).error.innererror.errordetails[0].message);
                }
            });
        },
        onSave:function(){
            //step 1: get the payload data
            var payload = this.oLocalModel.getProperty("/prodData");
            //step 2: validate the data
            if (!payload.PRODUCT_ID){
                MessageBox.error("Empty product id not allowed");
                return;
            }
            //step 3: get the odata model object
            var oDataModel = this.getOwnerComponent().getModel();
            //step 4: trigger the POST call to SAP using odata model method CREATE
            if (this.mode === "Create"){
                oDataModel.create("/ProductSet", payload,{
                    //step 5: success: to handle if the post was successful
                    success: function(data){
                        MessageToast.show("Wow! The product is created in SAP now");
                    },
                    //step 6: error: to handle if the post failed
                    error: function(oErr){
    
                    }
                });
            }else{
                oDataModel.update("/ProductSet('" + payload.PRODUCT_ID + "')", payload,{
                    //step 5: success: to handle if the post was successful
                    success: function(data){
                        MessageToast.show("Bingo! The update has been done 😂");
                    },
                    //step 6: error: to handle if the post failed
                    error: function(oErr){
                        MessageBox.error("Hola! the update crashed 😒");
                    }
                });
            }
            
        },
        onPopupConfirm: function(oEvent){
            var sId = oEvent.getSource().getId();
            //Step1: Find which item was selected by user
            var oSelectedItem = oEvent.getParameter("selectedItem");
            //Step2: Extract the title of selected item
            var sBpId = oSelectedItem.getTitle();
            var sCompanyName = oSelectedItem.getDescription();
            this.oLocalModel.setProperty("/prodData/SUPPLIER_ID", sBpId);
            this.oLocalModel.setProperty("/prodData/SUPPLIER_NAME", sCompanyName);            
            
        },
        oSupplierPopup: null,
        onF4Supplier: function(){
            //Create a copy of global this pointer to local variable so we can access
            //our controller object inside promise function
            var that = this;
            if (this.oSupplierPopup == null) {
                Fragment.load({
                    fragmentName: 'ey.hr.payroll.fragments.popup',
                    type: 'XML',
                    id:'supplier',
                    controller: this
                }).then(function(oFragment){
                    that.oSupplierPopup = oFragment;
                    that.oSupplierPopup.setTitle("Select Suppliers");
                    that.getView().addDependent(that.oSupplierPopup);
                    that.oSupplierPopup.bindAggregation("items",{
                        path: '/SupplierSet',
                        template: new sap.m.StandardListItem({
                            title: '{BP_ID}',
                            description: '{COMPANY_NAME}',
                            icon: 'sap-icon://supplier'
                        })
                    });
                    that.oSupplierPopup.open();
                });
            }else{
                this.oSupplierPopup.open();
            }
        },
        onDelete: function(oEvent){
            //step 1: get the key of product to be deleted
            var prodId = this.oLocalModel.getProperty("/prodData/PRODUCT_ID");
            //Step 2: get the odata model object
            var oDataModel = this.getOwnerComponent().getModel();
            //Step 3: call odata to perform the delete operation
            oDataModel.remove("/ProductSet('" + prodId +"')",{
                success: function(){
                   MessageBox.confirm("The product was deleted from SAP");
                },
                error: function(){

                }
            });

        },
        mode: "Create",
        setMode: function(sMode){
            
            if(sMode === "Create"){
                //Setting Create mode - Save, all fields are editable
                this.getView().byId("idSave").setText("Save");
                this.getView().byId("prodid").setEnabled(true);
                this.getView().byId("idDelete").setEnabled(false);
                
            }else{
                //Edit Mode - Update, Product id must be Locked
                this.getView().byId("idSave").setText("Update");
                this.getView().byId("prodid").setEnabled(false);
                this.getView().byId("idDelete").setEnabled(true);
            }
            this.mode = sMode;           

        },
        onClear: function(){
            this.setMode("Create");
            this.oLocalModel.setProperty("/prodData",{
                "PRODUCT_ID": "",
                "TYPE_CODE": "PR",
                "CATEGORY": "Notebooks",
                "NAME": "",
                "DESCRIPTION": "",
                "SUPPLIER_ID": "0100000046",
                "SUPPLIER_NAME": "SAP",
                "TAX_TARIF_CODE": "1 ",
                "MEASURE_UNIT": "EA",
                "PRICE": "0.00",
                "CURRENCY_CODE": "USD",
                "DIM_UNIT": "CM",
                "PRODUCT_PIC_URL": "/sap/public/bc/NWDEMO_MODEL/IMAGES/"
            });
        }
    });
});