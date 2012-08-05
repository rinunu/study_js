import akka.actor.{ActorRef, Props}
import play.api.libs.concurrent.Akka
import play.api.{Application, GlobalSettings}
import play.api.Play.current

object Global extends GlobalSettings {
  override def onStart(app: Application) {
  }
}
