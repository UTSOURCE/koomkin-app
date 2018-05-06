import { Component, OnInit } from '@angular/core';
import { IonicPage, NavController, NavParams, ModalController } from 'ionic-angular';
import { RestProvider } from '../../providers/rest/rest';
import { LeadPage } from '../lead/lead';

@IonicPage()
@Component({
  selector: 'page-leads',
  templateUrl: 'leads.html',
})

export class LeadsPage implements OnInit {

  items: any = [];
  itemExpandHeight: number = 200;
  leads;
  page = 1;
  user;
  selectedLike; 

  constructor(public navCtrl: NavController,
    public navParams: NavParams,
    public provedor: RestProvider,
    public modalCtrl: ModalController) {
  }

  ngOnInit() {
    this.getLeadsReport();
  }

  public getLeadsReport() {
    this.provedor.getLeadsReport()
      .then(
      (data) => {
        this.leads = data;
        //console.log(this.leads);
        for (let k in this.leads) {
          this.leads[k].FECHA = this.leads[k].FECHA.substring(0, 10).replace(/^(\d{4})-(\d{2})-(\d{2})$/g, '$3/$2/$1');
          this.leads[k].NOMBRE = this.leads[k].NOMBRE.substring(0, 18);
          this.leads[k].EMPRESA = this.leads[k].EMPRESA.substring(0,35);
          this.selectedLike =  this.leads[k].calificaLead;
        }

        //console.log(this.leads);
      },
      (error) => {
        console.log(error);
      });
  }

  doInfinite(infiniteScroll) {
    console.log('Cargando Leads');

    setTimeout(() => {
      for (let i = 0; i < 30; i++) {
        this.items.push(this.items.length);
      }
      console.log('Se acabaron de cargar los Leads');
      infiniteScroll.complete();
    }, 500);
  }

  ionViewDidLoad() {
  }

  verLead(lead){
    this.navCtrl.push(LeadPage, lead);
  }

  mostrar_modal() {
    let modal = this.modalCtrl.create(LeadPage);
    modal.present();
  }

}