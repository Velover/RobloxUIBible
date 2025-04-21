import { atom } from "@rbxts/charm";
import { useAtom } from "@rbxts/react-charm";
import { Workspace } from "@rbxts/services";

const screen_size_atom = atom(Workspace.CurrentCamera?.ViewportSize ?? Vector2.one);
let screen_size_changed_connection: RBXScriptConnection | undefined = undefined;

function OnCameraChanged(camera?: Camera) {
	if (camera === undefined) return;
	screen_size_changed_connection?.Disconnect();
	screen_size_atom(camera.ViewportSize);
	screen_size_changed_connection = camera.GetPropertyChangedSignal("ViewportSize").Connect(() => {
		screen_size_atom(camera.ViewportSize);
	});
}

OnCameraChanged(Workspace.CurrentCamera);
Workspace.GetPropertyChangedSignal("CurrentCamera").Connect(() => {
	OnCameraChanged(Workspace.CurrentCamera);
});

export function useScreenSize(): Vector2 {
	return useAtom(screen_size_atom);
}

export function GetScreenSizeAtom(): Vector2 {
	return screen_size_atom();
}
